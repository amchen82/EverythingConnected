from flask import Flask, redirect, url_for, render_template, session
from flask_dance.contrib.google import make_google_blueprint, google
import os
from dotenv import load_dotenv


load_dotenv()  # ⬅️ loads from .env into environment

app = Flask(__name__)


app.secret_key = os.environ.get("FLASK_SECRET_KEY", "supersecretkey")

# Replace with your actual Google OAuth credentials
app.config["GOOGLE_OAUTH_CLIENT_ID"] =os.getenv("GOOGLE_OAUTH_CLIENT_ID")

app.config["GOOGLE_OAUTH_CLIENT_SECRET"] = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
app.config["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")


google_bp = make_google_blueprint(
    scope=[
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
        "https://www.googleapis.com/auth/gmail.readonly",
       
    "https://www.googleapis.com/auth/calendar"
    ],
    redirect_url="/welcome",
    offline=True,  # Ensures access_type=offline
    reprompt_consent=True  # Ensures prompt=consent
)
app.register_blueprint(google_bp, url_prefix="/login")

@app.route("/")
def index():
    return render_template("index.html")

from flask import Flask, redirect, url_for, render_template, session, request
# ... other imports

@app.route("/welcome")
def welcome():
    if not google.authorized:
        return redirect(url_for("google.login"))
    resp = google.get("/oauth2/v2/userinfo")
    assert resp.ok, resp.text
    email = resp.json()["email"]

    summaries = session.pop("email_summaries", None)  # Show once, then remove
    events = session.pop("calendar_events", None)
    event_status = session.pop("event_status", None)
    grouped_events = session.pop("grouped_events", None)
    summary_audios = session.pop("summary_audios", None)
    print("Audio path:", summary_audios)
    return render_template("welcome.html", email=email, summaries=summaries, events=events,
                           event_status=event_status, grouped_events=grouped_events, summary_audios= summary_audios)


from flask import request
import base64
import re

import base64
import re
import openai


def smart_summarize(text):

    from openai import OpenAI
    client = OpenAI(api_key=app.config["OPENAI_API_KEY"])
    prompt = f"Summarize the following , point out who/when/what to do , make it in a format that  sounds like human speak. \n for example a summary can be :Susan just shared the Annie scene video from show :\n\n{text}"
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
          messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_tokens=300
    )

# print(response.output_text)
#     prompt = f"Summarize the following email in a clear sentence a human would speak to remind :\n\n{text}"
#     response = openai.ChatCompletion.create(
#         model="gpt-4",
#         messages=[{"role": "user", "content": prompt}],
#         temperature=0.6,
#         max_tokens=100
#     )
    return response.choices[0].message.content.strip()

from gtts import gTTS
import uuid



def generate_voice(text, lang="en"):
    # Ensure the audio directory exists
    audio_dir = "static/audio"
    os.makedirs(audio_dir, exist_ok=True)

    # Generate unique filename
    filename = f"{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(audio_dir, filename)

    # Generate and save audio
    tts = gTTS(text=text, lang=lang)
    tts.save(filepath)

    return f"/static/audio/{filename}"  # URL path for HTML <audio>

@app.route("/summarize-emails", methods=["POST"])
def summarize_emails():
    if not google.authorized:
        return redirect(url_for("google.login"))

    # Gmail query: Only Primary category
    query = 'category:primary -category:promotions -category:social'
    resp = google.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", params={
        "q": query,
        "maxResults": 50  # Fetch more so we can filter down
    })

    if not resp.ok:
        session["email_summaries"] = ["❌ Failed to fetch messages."]
        return redirect(url_for("welcome"))

    messages = resp.json().get("messages", [])
    summaries = []

    for msg in messages:
        msg_id = msg["id"]
        msg_detail = google.get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}?format=full")
        if not msg_detail.ok:
            continue

        payload = msg_detail.json().get("payload", {})
        headers = payload.get("headers", [])
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "(No Subject)")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "(Unknown Sender)").lower()

        # Heuristic 1: filter out bot/marketing sender emails
        bad_sender_patterns = ["noreply", "no-reply", "newsletter", "offers@", "promotions@", "donotreply"]
        if any(bad in sender for bad in bad_sender_patterns):
            continue

        # Heuristic 2: subject looks like a promotion
        promo_keywords = ["sale", "deal", "discount", "offer", "% off", "clearance"]
        if any(keyword in subject.lower() for keyword in promo_keywords):
            continue

        # Try to extract plain text body
        parts = payload.get("parts", [])
        body = ""
        for part in parts:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                try:
                    decoded = base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8")
                    body = decoded.strip()
                    break
                except Exception:
                    continue

        if not body:
            continue

        # Heuristic 3: filter out unsubscribe/marketing footer
        if re.search(r"unsubscribe|manage preferences|view in browser", body.lower()):
            continue

        # Keep meaningful preview
        body_preview = re.sub(r'\s+', ' ', body)[:300]

        msg_data = msg_detail.json()
        internal_ts = int(msg_data.get("internalDate", 0))

        
        raw_summary = f"From: {sender}, Subject: {subject}. {body_preview}"
        ai_summary = smart_summarize(raw_summary)

     
        summaries.append({
            "subject": subject,
            "body": body_preview,
            "date": internal_ts,
             "summary": ai_summary
        })

        

        # Optional: stop after 10 clean summaries
        if len(summaries) >= 10:
            break

    # Handle empty result
    if not summaries:
        summaries = ["✅ all promotional emails found. You're all clear!"]
        session["email_summaries"] = summaries
    else :
        # Sort by internalDate descending
        summaries_sorted = sorted(summaries, key=lambda x: x["date"], reverse=True)

        # Format for display
        formatted = [
            f"<strong>{s['subject']}</strong>: {s['body']}" for s in summaries_sorted[:10]
        ]
        session["email_summaries"] = formatted
        ai_summaries = " ".join([s["summary"] for s in summaries_sorted[:10]])

        print(ai_summaries)
        audio_url = generate_voice(ai_summaries)
        session["summary_audios"]= audio_url

    
    return redirect(url_for("welcome"))


from datetime import datetime, timedelta
import pytz

from collections import defaultdict
from datetime import datetime

@app.route("/read-calendar", methods=["POST"])
def read_calendar():
    if not google.authorized:
        return redirect(url_for("google.login"))

    # Set timezone (Google requires timezone-aware datetimes)
    timezone = pytz.timezone("UTC")  # Replace with your actual local timezone if needed
    now = datetime.now(timezone)
    three_days_later = now + timedelta(days=3)

    time_min = now.isoformat()        # Start now
    time_max = three_days_later.isoformat()  # End in 3 days

    # Step 1: Get user's calendar list
    cal_list_resp = google.get("https://www.googleapis.com/calendar/v3/users/me/calendarList")
    if not cal_list_resp.ok:
        print("Failed to fetch calendar list")
        session["calendar_events"] = [{"summary": "Failed to fetch calendar list", "start": ""}]
        return redirect(url_for("welcome"))

    calendar_items = cal_list_resp.json().get("items", [])
    events = []

    # Step 2: Fetch events from each calendar
    for calendar in calendar_items:
        cal_id = calendar.get("id")
        cal_name = calendar.get("summary", "Unnamed Calendar")

        events_resp = google.get(
            f"https://www.googleapis.com/calendar/v3/calendars/{cal_id}/events",
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": True,
                "orderBy": "startTime",
                "maxResults": 10  # optional: limit events per calendar
            }
        )

        if not events_resp.ok:
            print(f"Error fetching from calendar '{cal_name}':", events_resp.text)
            continue

        for item in events_resp.json().get("items", []):
            summary = item.get("summary", "(No Title)")
            start = item.get("start", {}).get("dateTime", item.get("start", {}).get("date", ""))
            events.append({
                "summary": f"{summary} <em>(from {cal_name})</em>",
                "start": start
            })

    # Step 3: Sort events by start time
    events_sorted = sorted(events, key=lambda e: e["start"])
    session["calendar_events"] = events_sorted

    

# After collecting all events...

# Convert ISO strings to date for grouping
    grouped = defaultdict(list)
    for e in events:
        dt = e["start"]
        try:
            dt_obj = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            date_key = dt_obj.strftime("%Y-%m-%d")
            readable_time = dt_obj.strftime("%I:%M %p")
        except Exception:
            date_key = "Unknown"
            readable_time = dt

        grouped[date_key].append({
            "summary": e["summary"],
            "start": readable_time
        })

    # Sort dates and create a clean list
    grouped_events = []
    for i in range(4):  # Today + 3 days
        date_key = (now + timedelta(days=i)).strftime("%Y-%m-%d")
        readable_date = (now + timedelta(days=i)).strftime("%A %b %d")
        grouped_events.append({
            "date": readable_date,
            "events": grouped.get(date_key, [])
        })



        

    session["grouped_events"] = grouped_events

    return redirect(url_for("welcome"))




from datetime import datetime
import pytz

@app.route("/create-event", methods=["POST"])
def create_event():
    if not google.authorized:
        return redirect(url_for("google.login"))

    title = request.form.get("title")
    start_input = request.form.get("start")
    end_input = request.form.get("end")

    try:
        # Parse and attach timezone
        tz = pytz.timezone("UTC")  # Or replace with 'US/Eastern' or your local zone
        start_dt = tz.localize(datetime.strptime(start_input, "%Y-%m-%dT%H:%M"))
        end_dt = tz.localize(datetime.strptime(end_input, "%Y-%m-%dT%H:%M"))

        # Build event payload
        event_data = {
            "summary": title,
            "start": {"dateTime": start_dt.isoformat()},
            "end": {"dateTime": end_dt.isoformat()}
        }

        # Send to Google Calendar API
        resp = google.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            json=event_data
        )

        if resp.ok:
            session["event_status"] = f"✅ Event '{title}' created!"
        else:
            print("Google API error:", resp.text)
            session["event_status"] = f"❌ Failed to create event: {resp.text}"

    except Exception as e:
        print("Event creation error:", e)
        session["event_status"] = f"❌ Invalid date format: {e}"

    return redirect(url_for("welcome"))

if __name__ == "__main__":
    app.run(debug=True)
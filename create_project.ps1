# A PowerShell script to create the directory structure and files for the Flask Google Login project.

# Define the project directory name
$ProjectDir = "google-login-app"

# --- Safety Check: Ensure the directory doesn't already exist ---
if (Test-Path -Path $ProjectDir) {
    Write-Error "Directory '$ProjectDir' already exists. Please remove it or run the script in a different location."
    exit 1
}

Write-Host "Creating project structure for '$ProjectDir'..." -ForegroundColor Green

# --- Create Directories ---
$null = New-Item -ItemType Directory -Path $ProjectDir
$null = New-Item -ItemType Directory -Path (Join-Path -Path $ProjectDir -ChildPath "templates")

# --- Create app.py ---
# Define content using a "here-string" (@' ... '@)
$appPyContent = @'
import os
from dotenv import load_dotenv
from flask import Flask, render_template, session, redirect, url_for
from authlib.integrations.flask_client import OAuth

# Load environment variables from .env file
load_dotenv()

# Initialize the Flask application
app = Flask(__name__)

# A secret key is required for session management
app.secret_key = os.urandom(24)

# Initialize OAuth for handling Google login
oauth = OAuth(app)

# Configure the Google OAuth client
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',  # OIDC-compliant userinfo endpoint
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)

# --- Routes ---

@app.route('/')
def index():
    """
    Renders the home page. If the user is already logged in,
    redirect them to the welcome page.
    """
    if 'user' in session:
        return redirect(url_for('welcome'))
    return render_template('index.html')

@app.route('/login')
def login():
    """
    Redirects the user to Google's authentication page.
    """
    # The 'auth' function is the callback URL
    redirect_uri = url_for('auth', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth')
def auth():
    """
    Handles the callback from Google. Fetches user info and stores it in the session.
    """
    token = google.authorize_access_token()
    # Fetch user info using the token
    user_info = google.parse_id_token(token, nonce=session.get('nonce'))
    # Store user information in the session
    session['user'] = user_info
    return redirect(url_for('welcome'))

@app.route('/welcome')
def welcome():
    """
    Displays the welcome page. If the user is not logged in,
    redirect them to the home page.
    """
    if 'user' not in session:
        return redirect(url_for('index'))
    
    # Get user details from the session
    user = session['user']
    return render_template('welcome.html', user_name=user.get('name'))

@app.route('/logout')
def logout():
    """
    Logs the user out by clearing the session.
    """
    session.pop('user', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    # Using port 5000 for local development
    app.run(debug=True, port=5000)
'@
Set-Content -Path (Join-Path -Path $ProjectDir -ChildPath "app.py") -Value $appPyContent

# --- Create templates/index.html ---
$indexHtmlContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Page</title>
    <style>
        /* Simple, responsive styling */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
        }
        .container {
            text-align: center;
            padding: 40px;
            border-radius: 8px;
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        .login-btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4285F4;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .login-btn:hover {
            background-color: #357ae8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to the Application</h1>
        <p>Please log in to continue.</p>
        <a href="{{ url_for('login') }}" class="login-btn">Login with Google</a>
    </div>
</body>
</html>
'@
Set-Content -Path (Join-Path -Path $ProjectDir -ChildPath "templates\index.html") -Value $indexHtmlContent

# --- Create templates/welcome.html ---
$welcomeHtmlContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        /* Re-using similar styling for consistency */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
        }
        .container {
            text-align: center;
            padding: 40px;
            border-radius: 8px;
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        .logout-btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #db4437;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        .logout-btn:hover {
            background-color: #c5372c;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- The user_name is passed from the Flask route -->
        <h1>Welcome, {{ user_name }}!</h1>
        <p>You have successfully logged in.</p>
        <a href="{{ url_for('logout') }}" class="logout-btn">Logout</a>
    </div>
</body>
</html>
'@
Set-Content -Path (Join-Path -Path $ProjectDir -ChildPath "templates\welcome.html") -Value $welcomeHtmlContent

# --- Create requirements.txt ---
$requirementsContent = @'
Flask
Authlib
python-dotenv
'@
Set-Content -Path (Join-Path -Path $ProjectDir -ChildPath "requirements.txt") -Value $requirementsContent

# --- Create .env file ---
$envContent = @'
# .env file
# Replace with your actual Google Client ID and Secret
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
'@
Set-Content -Path (Join-Path -Path $ProjectDir -ChildPath ".env") -Value $envContent

# --- Final Instructions ---
Write-Host ""
Write-Host "✅ Project '$ProjectDir' created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "--- Next Steps ---" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. IMPORTANT: Edit the .env file with your Google credentials:" -ForegroundColor Yellow
Write-Host "   notepad $($ProjectDir)\.env"
Write-Host ""
Write-Host "2. Navigate into your new project directory:" -ForegroundColor Yellow
Write-Host "   cd $ProjectDir"
Write-Host ""
Write-Host "3. Install the required Python packages:" -ForegroundColor Yellow
Write-Host "   pip install -r requirements.txt"
Write-Host ""
Write-Host "4. Run the Flask application:" -ForegroundColor Yellow
Write-Host "   python app.py"
Write-Host ""
Write-Host "5. Open your browser and go to: http://127.0.0.1:5000" -ForegroundColor Yellow
Write-Host ""
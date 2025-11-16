# TranslateAI

## Important Information:
- Code is COMPLETELY FINISHED
- Use your OWN API key located in "backend/.env" file
- The code was created locally and later imported as a whole project to GitHub due to an efficient process.
  - Reason: Did not want to remove the API key constantly when committing changes.
  - Backup folder was locally stored, in case code crashed completely due to trial and error-ing or attempting to integrate other apps into the code.
- Code was solely created by Nachiket using the help of multiple documentation websites and YouTube videos.
 <br>
 
## Frameworks Used:

### Frontend: NextJS
- TailWindCSS: For styling
- ReactQuery: For sending HTTP requests to backend
- Supabase: Authentication and Database (User Management system)
- ShadCN: UI component library
- TweakCN: UI component library
<br>

### Backend: Python 
- FastAPI: API backend
- Langchain: OpenAI integration
- Uvicorn: Hosting API backend locally
- Websocket: Realtime communication (for voice translation specifically)
- Pypdf2: PDF document parsing.
<br>

### More Tools/API Providers/Authenticators used:
- OpenAI API: Provides the API key to utilise for translations
- Brevo: Custom SMTP provider (custom emails from subdomain)
- Google oAuth (integrated in Supabase as a social connection)
- GitHub oAuth (integrated in Supabase as a social connection)
- Namecheap: Created/owns the "translateai.nachiketp.me" subdomain
- CloudFlare: Protecting and routing the traffic - connected to namecheap via nameserver integration
- CloudFlare Tunnel: Creates a safe, private connection from your local app to the internet (no port forwarding needed, no public IP leaks)
<br>

## Unable to implement the following:
- Auth0 was unable to be integrated as the registration/login portal due to limited online resources showing how to. Moreover, it was using an older version of Nextjs. Auth0 documentation used Nextjs v13, however I am using Nextjs v16.
<br>

## Getting Started  

#### Download the code:
1. Select "Code" and Download it as a ZIP
2. Extract the ZIP file within your computer
3. Open the folder in Visual Studio Code
4. Locate the ".env" file in the backend folder  
<br>

#### OpenAI API Creation:
5. Create an account in OpenAI to create an API key (https://auth.openai.com/create-account)
6. Go to the following page: https://platform.openai.com/api-keys
7. Select "Create a new secret key"
8. Create a name for the key and select the project otherwise leave to default if there is an option to do so
9. Next, click "Create a new secret key" again
10. Copy that secret key
11. Go to the ".env" file
12. Replace the the secret key with the following line: <your_openai_api_key_here>
13. The line should look similar to this: OPENAI_API_KEY=sk-............  
<br>

#### Run the Backend server:
14. Now, open an integrated terminal within the backend folder
15. Right-click the backend folder and open the integrated terminal
16. Then, run the following commands in the terminal, followed by enter: `uv sync`, `uv run main.oy` (These commands ensure all packages are installed locally within the folder and then automatically starts the backend application.)
17. Ensure the terminal is not closed completely and do not click "ctrl+c" (as this ends the process within the terminal)  
<br>

#### Run the Frontend server:
18. Moving on, open an integrated terminal within the front end folder
19. Right-click the backend folder and open the integrated terminal
20. Then, run the following commands in the terminal, followed by enter: `npm i`, ` npm run dev` (These commands ensure all packages are installed locally within the folder and then automatically starts the frontend application.)  
22. Ensure the terminal is not closed completely and do not click "ctrl+c" (as this ends the process within the terminal)  
<br>

#### Cloudflare Tunnel for backend: - otherwise translation will not work for users on other devices
23. Optional (Required for local user - IF running from incognito browser): To allow other users to access the translation tool without access to the code, do the following:
    - Install "Cloudflare tunnel" extension in VSC
    - Register or log in to the CloudFlare tunnel using the extension
    - Create a Tunnel
    - Port: 8000
    - Hostname: translate-api.nachiketp.me
    - Now, users will be able to access the TranslateAI's full functionality.  
<br>

#### Access and use TranslateAI:
24. To access the translation portal, go to "http://localhost:3000" or "https://translateai.nachiketp.me/" in your web browser.
25. Login or Register via email, Google Sign-in or GitHub.
26. Confirm your email if you registered via email.
27. Rest of the instructions are listed in the User Manual.
<br>



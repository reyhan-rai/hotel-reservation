# Upload this project to GitHub

1. Sign in at https://github.com/
2. Click **New repository** and name it `hotel-reservation`.
3. Choose **Public** if you want anyone to see the code. Do not include secrets or private credentials.
4. On your computer, extract `hotel-reservation-github-ready.zip`.
5. Open the extracted `hotel-reservation-github-ready` folder. Select all the items *inside it* (including `index.html`, `.gitignore`, `.ebextensions`, and other folders) and upload them to the repository root. Do not upload an extra parent folder around them.
6. Commit the files.
7. To publish the front end, go to **Settings → Pages → Deploy from a branch**, choose `main` and `/(root)`, then save.
8. Wait for the live URL to appear in Settings → Pages.

See `README.md` for more details and limitations. GitHub Pages only hosts the static front end; AWS/Docker/Jenkins pipeline configuration is included as coursework source, but it will not run automatically merely because the repository is uploaded.

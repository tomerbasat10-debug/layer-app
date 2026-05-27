# Android Google Login + Calendar Setup

Native Google Login and Google Calendar support are implemented in the app. To make the Android runtime authenticate with the Firebase project, finish this one-time Firebase Console setup:

1. Open Firebase Console for project `gen-lang-client-0692127785`.
2. Go to Project settings > General > Your apps.
3. Add or edit the Android app with package name `com.layer.app`.
4. Add this debug SHA-1 fingerprint:

   `24:3F:95:D7:0A:42:5B:77:AE:73:E2:53:C5:00:DB:4E:5A:F1:58:0A`

5. Enable Google as a Firebase Authentication sign-in provider.
6. Download the updated `google-services.json`.
7. Place it here:

   `android/app/google-services.json`

8. Re-run:

   `npx cap sync android`

For a release APK/AAB, also add the release signing certificate SHA-1 in Firebase before publishing.

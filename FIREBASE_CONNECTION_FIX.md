# Firebase connection fix

- The Settings page previously swallowed Firebase errors, so invalid credentials, a wrong database URL, or permissions problems all looked like a generic “Disconnected” status.
- The connection handler now validates the URL and required fields and retains a useful Firebase error message.
- The database URL is passed and stored as a URL (rather than being incorrectly typed as a numeric MQTT port).
- Read listeners report permission failures for the band/box paths.
- See README.md for Firebase Console prerequisites.

Important: this only makes connection failures diagnosable and fixes URL handling. It cannot make invalid Firebase credentials, missing users, disabled Email/Password authentication, or restrictive database rules work automatically.

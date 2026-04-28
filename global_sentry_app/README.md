# GlobalSentry App

Flutter companion app for the GlobalSentry web dashboard.

The web dashboard runs the analysis pipeline. This Flutter app only reads the
verified threat APIs and displays:

- a verified threat feed
- a satellite map with geocoded threat pins, matching the website map style
- threat detail pages with confidence, source, location, and recommended action

The map uses Esri World Imagery with Carto labels through `flutter_map`, so the
mobile view follows the same visual language as `GlobalSentry-Web/frontend/globe.html`.

## API

By default the app targets the deployed Render backend:

```txt
https://google-solution-challenge-u4m1.onrender.com/api
```

For local backend testing on Android emulator:

```sh
flutter run --dart-define=GLOBALSENTRY_API_BASE=http://10.0.2.2:8000/api
```

For Windows desktop or web, point it at the host API:

```sh
flutter run --dart-define=GLOBALSENTRY_API_BASE=http://localhost:8000/api
```

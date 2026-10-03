# Weather App

A simple weather application that uses **Open-Meteo** to provide weather forecasts and **Firebase** to manage user authentication and favourite locations.

The app focuses on presenting the most useful weather information without overwhelming the user with unnecessary data.

## Features

### Weather Forecast

The application uses the Open-Meteo API to provide:

* Current weather conditions
* **24-hour forecast** in 1-hour increments
* **10-day forecast**
* Historical weather data
* City/location search through Open-Meteo Geocoding

### Important Weather Information

Instead of displaying every available weather measurement, the application focuses on key information:

* Temperature
* **Feels like temperature**
* **Humidity**
* **Wind speed**
* Weather condition
* Forecast time

Weather data can be displayed using weather-related icons/images to make the forecast easier to understand at a glance.

### Favourite Locations

Firebase is used to store a user's favourite locations.

Users can:

* Sign up
* Sign in
* Sign out
* Add locations to favourites
* View their saved locations
* Remove locations from favourites

Favourite locations are associated with the authenticated Firebase user so that each user has their own saved locations.

---

# Technology Stack

| Technology              | Purpose                              |
| ----------------------- | ------------------------------------ |
| TypeScript              | Application and test code            |
| Open-Meteo              | Weather and forecast data            |
| Open-Meteo Geocoding    | Location/city search                 |
| Firebase Authentication | User registration and authentication |
| Firebase Firestore      | Storing favourite locations          |
| Jest / Testing Library  | Automated testing                    |

---

# Open-Meteo

The application uses [Open-Meteo](https://open-meteo.com/) because it does not require an API key or account for normal use.

The main APIs used by the application are:

### Forecast API

```text
/v1/forecast
```

Used to retrieve:

* Current weather
* Hourly forecasts
* Daily forecasts

The application uses the API to provide a **24-hour hourly forecast** and a **10-day forecast**.

Example request structure:

```text
/v1/forecast
  ?latitude=6.5244
  &longitude=3.3792
  &current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m
  &hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m
  &daily=temperature_2m_max,temperature_2m_min
  &forecast_days=10
```

The exact parameters may change depending on the application's implementation.

### Geocoding API

```text
/v1/search
```

Used to convert a city name into geographic coordinates.

For example:

```text
Lagos
```

can be resolved into latitude and longitude values which can then be passed to the Forecast API.

The application should use the returned **WGS84 latitude and longitude** values rather than relying on hard-coded coordinates.

### Historical Weather

```text
/v1/archive
```

Used when historical weather information is required.

Open-Meteo provides historical weather data going back to previous years, subject to the available archive data and API limitations.

---

# Application Flow

The basic application flow is:

```text
User
  │
  ├── Sign Up / Sign In
  │        │
  │        ▼
  │     Firebase Auth
  │
  └── Search for Location
           │
           ▼
     Open-Meteo Geocoding
           │
           ▼
      Latitude/Longitude
           │
           ▼
      Open-Meteo Forecast
           │
           ├── Current Weather
           ├── 24-Hour Forecast
           └── 10-Day Forecast
           
           │
           ▼
      Save as Favourite
           │
           ▼
       Firebase
        Firestore
```

---

# Firebase

Firebase is responsible for user authentication and storing favourite locations.

## Firebase Authentication

The application supports:

* User registration
* User login
* User logout
* Authentication state monitoring
* Authentication error handling

### Authentication Methods

The application uses Firebase Authentication methods such as:

```text
createUserWithEmailAndPassword()
signInWithEmailAndPassword()
onAuthStateChanged()
signOut()
```

---

# Favourite Locations

Favourite locations should be stored in Firestore and associated with the authenticated user's UID.

A conceptual structure could be:

```text
users
 └── {userId}
      └── favourites
           └── {locationId}
                ├── name
                ├── latitude
                ├── longitude
                └── createdAt
```

For example:

```text
users
 └── abc123
      └── favourites
           ├── lagos
           │    ├── name: "Lagos"
           │    ├── latitude: 6.5244
           │    └── longitude: 3.3792
           │
           └── london
                ├── name: "London"
                ├── latitude: 51.5074
                └── longitude: -0.1278
```

This ensures that favourite locations belong to the correct authenticated user.

---

# Weather Data Display

The application intentionally avoids displaying excessive weather information.

The primary information shown to the user should include:

### Current Weather

* Current temperature
* Feels-like temperature
* Humidity
* Wind speed
* Weather condition
* Weather image/icon

### 24-Hour Forecast

The hourly forecast displays weather information for the next 24 hours in **1-hour increments**.

Example:

| Time  | Temperature | Feels Like | Humidity |    Wind |
| ----- | ----------: | ---------: | -------: | ------: |
| 12:00 |        29°C |       32°C |      78% | 12 km/h |
| 13:00 |        30°C |       33°C |      75% | 14 km/h |
| 14:00 |        30°C |       33°C |      73% | 15 km/h |

### 10-Day Forecast

The daily forecast provides a simplified overview of upcoming weather.

Example:

| Day      | Condition     | High |  Low |
| -------- | ------------- | ---: | ---: |
| Today    | Partly Cloudy | 31°C | 25°C |
| Tomorrow | Rain          | 29°C | 24°C |
| Day 3    | Cloudy        | 30°C | 25°C |

The exact information displayed can be adjusted depending on the UI design.

---

# Testing

The application includes tests for both Firebase and Open-Meteo.

## Firebase Tests

### TC-FB-001 — Sign-up Success

Test that:

```text
createUserWithEmailAndPassword(auth, email, password)
```

with valid, unused credentials:

* Creates a Firebase user
* Returns a valid user credential
* Provides a valid Firebase user
* Updates the authentication state

### TC-FB-002 — Sign-in Success

Test that:

```text
signInWithEmailAndPassword(auth, email, password)
```

with valid existing credentials:

* Successfully authenticates the user
* Returns a valid user credential
* Updates the authentication state

### TC-FB-003 — Invalid Input / Authentication Errors

Test invalid authentication scenarios including:

* Weak password
* Invalid email format
* Incorrect password
* Email already registered
* Non-existent account
* Empty email
* Empty password

Expected Firebase authentication errors should be handled appropriately.

Examples include:

```text
auth/wrong-password
auth/email-already-in-use
auth/invalid-email
auth/user-not-found
auth/weak-password
```

### TC-FB-004 — Authentication State Observer

Test that:

```text
onAuthStateChanged(auth, callback)
```

responds correctly when:

* A user signs in
* A user signs out
* The authentication state changes

The callback should receive the correct user or `null`.

### TC-FB-005 — Favourite Location

Test that an authenticated user can:

* Save a favourite location
* Retrieve their favourite locations
* Remove a favourite location
* Maintain the location's latitude and longitude
* Access only their own saved locations

### TC-FB-006 — Unauthenticated Favourite Access

Test that a user who is not authenticated cannot create or access protected favourite-location data.

---

# Open-Meteo Tests

## TC-OM-001 — Forecast API

Test:

```text
/v1/forecast
```

and verify that the response:

* Returns successfully
* Contains the requested latitude
* Contains the requested longitude
* Contains hourly forecast data
* Contains correctly structured hourly arrays
* Contains the expected weather variables
* Contains `generationtime_ms`
* Provides the requested forecast period

The hourly arrays should have consistent lengths so that timestamps correctly correspond to weather measurements.

## TC-OM-002 — Historical Weather

Test:

```text
/v1/archive
```

and verify that:

* The request succeeds for a valid location and date range
* Historical data is returned
* The requested date range is represented correctly
* The returned time series is continuous where data is available
* Weather variables have the expected structure

Historical availability should be treated according to Open-Meteo's supported archive range rather than assuming every date is available.

## TC-OM-003 — Geocoding API

Test:

```text
/v1/search
```

with a city such as:

```text
Lagos
```

and verify that:

* The request succeeds
* A matching location is returned
* The location contains a city/name
* Latitude is returned as a number
* Longitude is returned as a number
* Coordinates represent WGS84 geographic coordinates
* Multiple matching locations can be handled when returned

## TC-OM-004 — Invalid Location Search

Test searches for:

* Empty search terms
* Non-existent cities
* Invalid query parameters

The application should handle no-result responses without crashing.

## TC-OM-005 — Invalid Coordinates

Test invalid or missing:

* Latitude
* Longitude

The application should handle API errors appropriately.

## TC-OM-006 — Forecast Data Integrity

Verify that:

* Every hourly timestamp has corresponding weather data
* Arrays have matching lengths
* Temperatures are numeric
* Humidity values are valid percentages
* Wind speeds are numeric
* Missing values are handled safely

## TC-OM-007 — API Failure

Test how the application behaves when:

* Open-Meteo is unavailable
* The request times out
* The network connection is lost
* The API returns an HTTP error
* The response contains unexpected data

The application should show an appropriate error state rather than crashing.

---

# Error Handling

The application should gracefully handle errors from both external services and Firebase.

Examples include:

### Network Errors

```text
Unable to connect to the weather service.
Please check your internet connection.
```

### Location Errors

```text
Location not found.
Try searching for another city.
```

### Authentication Errors

```text
Incorrect email or password.
```

### Forecast Errors

```text
Weather data is currently unavailable.
Please try again later.
```

The UI should avoid exposing raw API or Firebase error messages directly to users where a clearer message can be provided.

---

# Project Structure

A possible TypeScript structure is:

```text
src/
├── components/
│   ├── CurrentWeather
│   ├── HourlyForecast
│   ├── DailyForecast
│   ├── LocationSearch
│   └── FavouriteLocations
│
├── services/
│   ├── firebase.ts
│   ├── weatherService.ts
│   └── geocodingService.ts
│
├── types/
│   ├── weather.ts
│   ├── location.ts
│   └── user.ts
│
├── utils/
│   └── weatherUtils.ts
│
└── tests/
    ├── firebase/
    └── openMeteo/
```

The exact structure can be changed to match the project's framework.

---

# Environment Variables

Firebase configuration should not be hard-coded throughout the application.

Environment variables should be used for Firebase configuration where appropriate.

Example:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Open-Meteo does not require an API key for the intended API usage.

---

# Testing Principles

Tests should verify both **successful behaviour and failure behaviour**.

The test suite should cover:

* Valid input
* Invalid input
* Empty input
* Authentication failures
* API failures
* Network failures
* Missing data
* Unexpected API responses
* Authentication state changes
* Favourite-location persistence
* User-specific data isolation
* Weather-data structure and consistency

External API tests should avoid relying exclusively on live services where possible. Unit tests can mock API responses, while a smaller number of integration tests can verify the real API contract.

---

# Goals

The main goal of the application is to provide a simple weather experience that answers the questions users are most likely to have:

**What is the weather now?**

**What will it feel like?**

**What will the next 24 hours look like?**

**What will the next 10 days look like?**

**What are the weather conditions in my favourite locations?**

The application combines Open-Meteo's weather data with Firebase authentication and persistence to provide these features while keeping the interface focused on useful information.

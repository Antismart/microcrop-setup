WeatherXM Pro API Documentation
v1.12.1
Introduction
Welcome to the WeatherXM Pro API documentation. This API is part of WeatherXM Pro, a robust platform designed to provide enhanced tools for exploring weather station observations, hyperlocal forecasts, and historical weather data. The API is a critical component, enabling developers to seamlessly integrate WeatherXM's high-quality data into their applications.

This documentation page provides comprehensive details, use cases, and examples to help you make the most of the WeatherXM Pro API.

What You Can Do with the API
The WeatherXM Pro API enables you to:

Retrieve weather stations in specific areas using bounding boxes or proximity searches.
Access historical observation data for specific weather stations.
Fetch forecasts, both hourly and daily, for specific geospatial areas (H3 cells).
Monitor station metadata, including location, health, and data quality scores.
The API's versatility makes it suitable for applications in agriculture, logistics, energy, and more.

Example Use Case: Get the Latest Weather Data from a Station in a Specific Area
This example demonstrates how to:

Retrieve a list of weather stations within a bounding box.
Fetch the latest observation data from one of the retrieved stations.
For this example, we will use a bounding box around Central Park, NY.

Step 1: Get a List of Stations Within a Bounding Box
Endpoint: GET /stations/bounds

This step retrieves weather stations within a bounding box defined by latitude and longitude.

Request Example
curl -X GET "https://pro.weatherxm.com/api/stations/bounds?min_lat=40.76&min_lon=-73.98&max_lat=40.79&max_lon=-73.94" \
-H "X-API-KEY: YOUR_API_KEY"
Query Parameters
min_lat: Minimum latitude of the bounding box.
min_lon: Minimum longitude of the bounding box.
max_lat: Maximum latitude of the bounding box.
max_lon: Maximum longitude of the bounding box.
Example Response
{
  "stations": [
    {
      "id": "3355b780-438d-11ef-8e8d-b55568dc8e66",
      "name": "Scrawny Magnolia Sunset",
      "lastDayQod": 0.9990059523809524,
      "cellId": "872a10089ffffff",
      "createdAt": "2024-09-06T00:01:49.685Z",
      "location": {
        "lat": 40.77334213256836,
        "lon": -73.94979095458984
      }
    },
    {
      "id": "efae5a90-8db9-11ec-900c-abdec1c57354",
      "name": "Odd Foggy Noreaster",
      "lastDayQod": 0,
      "cellId": "872a10089ffffff",
      "createdAt": "2022-03-21T09:04:35.157Z",
      "location": {
        "lat": 40.782613,
        "lon": -73.96528
      }
    }
  ]
}
Step 2: Fetch the Latest Observation Data for a Station
Using the first station from the previous response (3355b780-438d-11ef-8e8d-b55568dc8e66), this step retrieves the latest observation data for that station.

Endpoint: GET /stations/{station_id}/latest

Request Example
curl -X GET "https://pro.weatherxm.com/api/stations/3355b780-438d-11ef-8e8d-b55568dc8e66/latest" \
-H "X-API-KEY: YOUR_API_KEY"
Path Parameters
station_id: The unique identifier of the station.
Example Response
{
  "observation": {
    "timestamp": "2025-01-17T15:42:20.248Z",
    "temperature": 1.4,
    "feels_like": 1.4,
    "dew_point": -1.1717342238520458,
    "humidity": 83,
    "precipitation_rate": 0,
    "wind_speed": 0,
    "wind_gust": 0,
    "wind_direction": 180,
    "uv_index": 0,
    "pressure": 975.33,
    "solar_irradiance": 2.6,
    "created_at": "2025-01-17T15:42:20.248Z"
  },
  "health": {
    "timestamp": "2025-01-16T00:00:00.000Z",
    "data_quality": { "score": 0.9527791666666667 },
    "location_quality": { "score": 1, "reason": "-" }
  }
}
Example Use Case: Calculate Precipitation Accumulation
This example demonstrates how to get the total precipitation accumulated in time period.
For the sake of the example we are going to get the daily precipitation accumulated for a station in a day

function calculate_precipitation_accumulated():
  response = http_get('https://pro.weatherxm.com/api/v1/stations/4a6df0c0-b7d9-11ef-96c4-2f3b3806a23a/history?date=2025-05-24')
  
  total = 0

  for i from 0 to length(response.data) - 1:
      previous = data[i - 1].precipitation_accumulated
      current = data[i].precipitation_accumulated

      if current >= previous:
          diff = current - previous
      else:
          # Handle counter reset
          diff = current

      total += diff

  return total
Authentication
The WeatherXM Pro API uses an API key for authentication. Include your key in the X-API-KEY header for every request.

You can find and copy your API key on the API Management page.

Example:

-H "X-API-KEY: YOUR_API_KEY"

Get a list of stations within a radius from a location
get
https://pro.weatherxm.com/api/v1/stations/near
Provide the center (location latitude and longitude) and a radius (in meters) to get a list of stations within that radius

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Query Parameters
lat
number
required
Latitude of the center of the area

lon
number
required
Longitude of the center of the area

radius
number
required
Radius (in meters) for which stations are queried

Responses
200
400
401
429
A list of stations

Body

application/json

application/json
id
string
The station's unique identifier

Example:
04f39e90-f3ce-11ec-960f-d7d4cf200cc9
name
string
The station's unique name

cellIndex
string
The index of the Cell this station belongs to, based on H3 algorithm''s index definition. Read more.'

Example:
871eda664ffffff
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
createdAt
string
The ISO8601 datetime this station has observation data since.


Get a list of stations within a bounding box
get
https://pro.weatherxm.com/api/v1/stations/bounds
Provide bounding box coordinates to get a list of stations

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Query Parameters
max_lat
number
required
The maximum latitude of the bounding box

max_lon
number
required
The maximum longitude of the bounding box

min_lat
number
required
The minimum latitude of the bounding box

min_lon
number
required
The minimum longitude of the bounding box

Responses
200
400
401
429
A list of stations in the bounding box

Body

application/json

application/json
array of:
id
string
The station's unique identifier

Example:
04f39e90-f3ce-11ec-960f-d7d4cf200cc9
name
string
The station's unique name

cellIndex
string
The index of the Cell this station belongs to, based on H3 algorithm''s index definition. Read more.'

Example:
871eda664ffffff
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
createdAt
string
The ISO8601 datetime this station has observation data since.

X-API-KEY
:
123
max_lat*
:
number
max_lon*
:
number
min_lat*
:
number
min_lon*
:
number
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/bounds \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
[
  {
    "id": "04f39e90-f3ce-11ec-960f-d7d4cf200cc9",
    "name": "string",
    "cellIndex": "871eda664ffffff",
    "location": {
      "lat": 37.97168,
      "lon": 23.725697,
      "elevation": 1400
    },
    "createdAt": "string"
  }
]
 
 Get a complete list of stations
get
https://pro.weatherxm.com/api/v1/stations
Retrieve all available stations

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Responses
200
401
429
A complete list of stations

Body

application/json

application/json
array of:
id
string
The station's unique identifier

Example:
04f39e90-f3ce-11ec-960f-d7d4cf200cc9
name
string
The station's unique name

cellIndex
string
The index of the Cell this station belongs to, based on H3 algorithm''s index definition. Read more.'

Example:
871eda664ffffff
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
createdAt
string
The ISO8601 datetime this station has observation data since.

Search for cells by region name
get
https://pro.weatherxm.com/api/v1/cells/search
Returns a list of cells based on a string search for a specific region name.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Query Parameters
query
string
required
The name of the region to search for cells

Responses
200
401
429
A list of cells matching the region search

Body

application/json

application/json
array of:
index
string
Cell index, based on H3 algorithm's index definition. Read more.

Example:
822d57fffffffff
center
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
station_count
integer
The number of stations in the cell

Get all stations in a H3 cell
get
https://pro.weatherxm.com/api/v1/cells/{cell_index}/stations
Returns a list of stations that are deployed within the cell.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
cell_index
string
required
The H3 index of the cell to return stations for

Responses
200
401
429
A list of cells matching the region search

Body

application/json

application/json
array of:
id
string
The station's unique identifier

Example:
04f39e90-f3ce-11ec-960f-d7d4cf200cc9
name
string
The station's unique name

cellIndex
string
The index of the Cell this station belongs to, based on H3 algorithm''s index definition. Read more.'

Example:
871eda664ffffff
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
createdAt
string
The ISO8601 datetime this station has observation data since.

X-API-KEY
:
123
cell_index*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/cells/{cell_index}/stations \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
[
  {
    "id": "04f39e90-f3ce-11ec-960f-d7d4cf200cc9",
    "name": "string",
    "cellIndex": "871eda664ffffff",
    "location": {
      "lat": 37.97168,
      "lon": 23.725697,
      "elevation": 1400
    },
    "createdAt": "string"
  }
]


Latest observation
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/latest
Retrieves the latest observation for a specific station. Note: The "health" field in the response is deprecated and will be moved to the new /stations/{station_id}/health endpoint.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
Responses
200
400
401
404
429
Success

Body

application/json

application/json
responses
/
200
observation
object
Station weather observation

timestamp
string<date-time>
Timestamp of the observation, in ISO8601 datetime, with time zone

Example:
2024-03-20T15:30:00+02:00
temperature
number<float>
Temperature, in degrees Celsius

Example:
23.5
feels_like
number<float>
Felt temperature, in degrees Celsius

Example:
23.5
dew_point
number<float>
Dew point, in degrees Celsius

Example:
12.8
precipitation_rate
number<float>
Precipitation rate, in mm/h

Example:
12.8
precipitation_accumulated
number<float>
This field reports the total accumulated precipitation in millimeters (mm) as a continuously increasing counter that resets to 0 when it reaches its maximum value or on station reboot. To calculate daily precipitation, iterate over all the values and subtract each previous value from the current one to get the difference. if the current value is less than the previous (indicating a reset), assume the current value is the difference. Sum all differences over the day to get the total precipitation in mm.

Example:
150.4
humidity
number<float>
Relative humidity, percentage

Example:
65.4
wind_speed
number<float>
Wind speed, in m/s

Example:
4.2
wind_gust
number<float>
Wind gust, in m/s

Example:
8.7
wind_direction
integer
Wind direction, in degrees

Example:
180
uv_index
number
UV index

Example:
6.5
pressure
number<float>
Barometric pressure, in hPa

Example:
1013.2
solar_irradiance
number<float>
Solar irradiance, in watts per square metre (W/m²)

Example:
850.5
icon
string
Icon name corresponding to current weather conditions

Example:
partly-cloudy-day
health
object
timestamp
string<date-time>
Timestamp when the health metrics were calculated, in ISO8601 datetime

Example:
2024-03-20T15:30:00+02:00
data_quality
object
location_quality
object
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
X-API-KEY
:
123
station_id*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/{station_id}/latest \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "observation": {
    "timestamp": "2024-03-20T15:30:00+02:00",
    "temperature": 23.5,
    "feels_like": 23.5,
    "dew_point": 12.8,
    "precipitation_rate": 12.8,
    "precipitation_accumulated": 150.4,
    "humidity": 65.4,
    "wind_speed": 4.2,
    "wind_gust": 8.7,
    "wind_direction": 180,
    "uv_index": 6.5,
    "pressure": 1013.2,
    "solar_irradiance": 850.5,
    "icon": "partly-cloudy-day"
  },
  "health": {
    "timestamp": "2024-03-20T15:30:00+02:00",
    "data_quality": {
      "score": 0.459
    },
    "location_quality": {
      "score": 0.459,
      "reason": "LOCATION_NOT_VERIFIED"
    }
  },
  "location": {
    "lat": 37.97168,
    "lon": 23.725697,
    "elevation": 1400
  }
}

Station's health
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/health
Retrieves the health of a specific station, including data quality and location quality.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
Responses
200
400
401
404
429
Success

Body

application/json

application/json
health
object
timestamp
string<date-time>
Timestamp when the health metrics were calculated, in ISO8601 datetime

Example:
2024-03-20T15:30:00+02:00
data_quality
object
location_quality
object
X-API-KEY
:
123
station_id*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/{station_id}/health \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "health": {
    "timestamp": "2024-03-20T15:30:00+02:00",
    "data_quality": {
      "score": 0.459
    },
    "location_quality": {
      "score": 0.459,
      "reason": "LOCATION_NOT_VERIFIED"
    }
  }
}

Historical observations for a specific date
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/history
Retrieves historical observations for a specific station on a specific date.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
The id of the station to get he historical observaions for

Query Parameters
date
string<date>
required
The date (in UTC) to get observation data for.

Example:
2024-10-29
Responses
200
400
401
404
429
Success

Body

application/json

application/json
responses
/
200
date
string<date>
Date, in ISO8601 date format

health
object
timestamp
string<date-time>
Timestamp when the health metrics were calculated, in ISO8601 datetime

Example:
2024-03-20T15:30:00+02:00
data_quality
object
location_quality
object
observations
array[object]
Station weather observation

timestamp
string<date-time>
Timestamp of the observation, in ISO8601 datetime, with time zone

Example:
2024-03-20T15:30:00+02:00
temperature
number<float>
Temperature, in degrees Celsius

Example:
23.5
feels_like
number<float>
Felt temperature, in degrees Celsius

Example:
23.5
dew_point
number<float>
Dew point, in degrees Celsius

Example:
12.8
precipitation_rate
number<float>
Precipitation rate, in mm/h

Example:
12.8
precipitation_accumulated
number<float>
This field reports the total accumulated precipitation in millimeters (mm) as a continuously increasing counter that resets to 0 when it reaches its maximum value or on station reboot. To calculate daily precipitation, iterate over all the values and subtract each previous value from the current one to get the difference. if the current value is less than the previous (indicating a reset), assume the current value is the difference. Sum all differences over the day to get the total precipitation in mm.

Example:
150.4
humidity
number<float>
Relative humidity, percentage

Example:
65.4
wind_speed
number<float>
Wind speed, in m/s

Example:
4.2
wind_gust
number<float>
Wind gust, in m/s

Example:
8.7
wind_direction
integer
Wind direction, in degrees

Example:
180
uv_index
number
UV index

Example:
6.5
pressure
number<float>
Barometric pressure, in hPa

Example:
1013.2
solar_irradiance
number<float>
Solar irradiance, in watts per square metre (W/m²)

Example:
850.5
icon
string
Icon name corresponding to current weather conditions

Example:
partly-cloudy-day
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
X-API-KEY
:
123
station_id*
:
string
date*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/{station_id}/history \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "date": "2019-08-24",
  "health": {
    "timestamp": "2024-03-20T15:30:00+02:00",
    "data_quality": {
      "score": 0.459
    },
    "location_quality": {
      "score": 0.459,
      "reason": "LOCATION_NOT_VERIFIED"
    }
  },
  "observations": [
    {
      "timestamp": "2024-03-20T15:30:00+02:00",
      "temperature": 23.5,
      "feels_like": 23.5,
      "dew_point": 12.8,
      "precipitation_rate": 12.8,
      "precipitation_accumulated": 150.4,
      "humidity": 65.4,
      "wind_speed": 4.2,
      "wind_gust": 8.7,
      "wind_direction": 180,
      "uv_index": 6.5,
      "pressure": 1013.2,
      "solar_irradiance": 850.5,
      "icon": "partly-cloudy-day"
    }
  ],
  "location": {
    "lat": 37.97168,
    "lon": 23.725697,
    "elevation": 1400
  }
}

Get S3 file URLs for a time range (up to 24h)
get
https://pro.weatherxm.com/api/v1/stations/today
Returns a list of S3 file URLs for the specified time range. The start and end datetimes must be in ISO8601 format (e.g., '2025-05-15T10:00Z') and can be up to 24 hours in the past until the current datetime.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Query Parameters
end
string<date-time>
End datetime in ISO8601 UTC format (up to now)

start
string<date-time>
required
Start datetime in ISO8601 UTC format (up to 24h in the past)

Responses
200
400
401
429
List of URLs for the requested time range containing the latest data for all stations

Body

application/json

application/json
Signed S3 URL to csv files containing data for all active stations in a specified 5 minute window and its corresponding datetime. Also give a Signed S3 URL to a QOD (Quality of Data) file for each date.Show all...

CSV Format for station files:
id,timestamp,temperature,humidity,precipitation_rate,precipitation_accumulated,wind_speed,wind_gust,wind_direction,pressure,solar_irradiance,uv_index,illuminance
Fields Description:
files
array[object]
Array of CSV file objects for each 5-minute window.

datetime
string
ISO8601 datetime string for the file

Example:
2025-09-30T00:10:00.000Z
url
string
Signed S3 URL for the file.

Example:
https://s3.amazonaws.com/csv/2025-09-30/00%3A10-00%3A15.csv
lastModified
string
The ISO8601 datetime the file was last modified.

Example:
2025-09-30T12:38:00.000Z
qod
array[object]
Array of QOD file objects for each date.

datetime
string
ISO8601 date string for the QOD file

Example:
2025-09-30
url
string
Signed S3 URL for the QOD file.

Example:
https://s3.amazonaws.com/csv/2025-09-30/qod.csv
X-API-KEY
:
123
start*
:
string
end
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/today \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "files": [
    {
      "datetime": "2025-09-30T00:10:00.000Z",
      "url": "https://s3.amazonaws.com/csv/2025-09-30/00%3A10-00%3A15.csv",
      "lastModified": "2025-09-30T12:38:00.000Z"
    }
  ],
  "qod": [
    {
      "datetime": "2025-09-30",
      "url": "https://s3.amazonaws.com/csv/2025-09-30/qod.csv"
    }
  ]
}

Get 7 day WXMv1 forecast for a cell
get
https://pro.weatherxm.com/api/v1/cells/{cell_index}/forecast/wxmv1
Returns WXMv1 weather forecast up to a week ahead for a cell

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
cell_index
string
required
The H3 index with resolution of the cell to return forecast for

Query Parameters
from
string<date>
required
The first day for which to get forecast data. Defaults to now

Example:
2024-10-29
include
string
required
The types of forecast to include. Accepted values are daily and hourly

to
string<date>
required
The last day for which to get forecast data. Defaults to 7 days from now

Example:
2024-10-29
Responses
200
400
401
429
Forecast for the requested cell

Body

application/json

application/json
responses
/
200
Station weather observation

array of:
tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
precipitation
number<float>
Forecasted precipitation

Example:
2.5
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
80.5
temperature
number<float>
Forecasted temperature, in degrees Celsius

Example:
25.7
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
humidity
number<float>
Humidity

Example:
65.5
pressure
number<float>
Forecasted pressure, hPa

Example:
1013.2
uv_index
number<float>
Forecasted UV index

Example:
8.2
feels_like
number<float>
Forecasted feels like temperature, in degrees Celsius

Example:
27.3
daily
object
Station weather forecast

temperature_max
number<float>
Forecasted max temperature, in degrees Celsius

Example:
25.6
temperature_min
number<float>
Forecasted min temperature, in degrees Celsius

Example:
15.2
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
0.75
precipitation_intensity
number<float>
Forecasted precipitation intensity in mm

Example:
2.5
humidity
number<float>
Humidity

Example:
65.5
uv_index
number<float>
Forecasted UV index

Example:
8.2
pressure
number<float>
Forecasted pressure, in hPa

Example:
1013.2
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
precipitation_type
string
Forecasted precipitation type

Example:
rain
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
X-API-KEY
:
123
cell_index*
:
string
from*
:
string
include*
:
string
to*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/cells/{cell_index}/forecast/wxmv1 \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
[
  {
    "tz": "Europe/Athens",
    "date": "2024-01-17",
    "hourly": [
      {
        "timestamp": "2025-05-28T06:00:00.000Z",
        "precipitation": 2.5,
        "precipitation_probability": 80.5,
        "temperature": 25.7,
        "icon": "partly-cloudy-day",
        "wind_speed": 15.7,
        "wind_direction": 180,
        "humidity": 65.5,
        "pressure": 1013.2,
        "uv_index": 8.2,
        "feels_like": 27.3
      }
    ],
    "daily": {
      "temperature_max": 25.6,
      "temperature_min": 15.2,
      "precipitation_probability": 0.75,
      "precipitation_intensity": 2.5,
      "humidity": 65.5,
      "uv_index": 8.2,
      "pressure": 1013.2,
      "icon": "partly-cloudy-day",
      "precipitation_type": "rain",
      "wind_speed": 15.7,
      "wind_direction": 180,
      "timestamp": "2025-05-28T06:00:00.000Z"
    }
  }
]

Get available models for a cell forecast
get
https://pro.weatherxm.com/api/v1/cells/{cell_index}/mm/models
Returns a list of all available forecast models for a specific cell

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
cell_index
string
required
The H3 index of the cell to retrieve forecast models for

Example:
8712ccc0cffffff
Responses
200
401
429
500
List of available forecast models for the requested cell

Body

application/json

application/json
array[string]
X-API-KEY
:
123
cell_index*
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/cells/{cell_index}/mm/models \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
[
  "string"

Get multi-model forecast for a cell
get
https://pro.weatherxm.com/api/v1/cells/{cell_index}/mm/forecast
Returns 7 day weather forecast from multiple models for a specific cell

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
cell_index
string
required
The H3 index of the cell to return multi-model forecast for

Example:
8712ccc0cffffff
Query Parameters
endTs
string<date-time>
End date for forecast data (must not be in the past and must be after startTs). Defaults to 7 days from current date.

Examples:
2025-05-012
2025-05-012T10:00
models
array[string]
Specific forecast models to include in the response

Examples:
ICON
UMGLOBAL10
startTs
string<date-time>
Start date for forecast data (must not be in the past). Defaults to current date.

Examples:
2025-05-04
2025-05-04T10:00
timezone
string
Timezone to use for the forecast data. If not provided, timezone will be determined from cell location.

Examples:
UTC
Europe/Athens
Responses
200
400
401
403
404
429
Multi-model forecast for the requested cell

Body

application/json

application/json
responses
/
200
Station weather observation

array of:
tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
precipitation
number<float>
Forecasted precipitation

Example:
2.5
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
80.5
temperature
number<float>
Forecasted temperature, in degrees Celsius

Example:
25.7
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
humidity
number<float>
Humidity

Example:
65.5
pressure
number<float>
Forecasted pressure, hPa

Example:
1013.2
uv_index
number<float>
Forecasted UV index

Example:
8.2
feels_like
number<float>
Forecasted feels like temperature, in degrees Celsius

Example:
27.3
daily
object
Station weather forecast

temperature_max
number<float>
Forecasted max temperature, in degrees Celsius

Example:
25.6
temperature_min
number<float>
Forecasted min temperature, in degrees Celsius

Example:
15.2
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
0.75
precipitation_intensity
number<float>
Forecasted precipitation intensity in mm

Example:
2.5
humidity
number<float>
Humidity

Example:
65.5
uv_index
number<float>
Forecasted UV index

Example:
8.2
pressure
number<float>
Forecasted pressure, in hPa

Example:
1013.2
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
precipitation_type
string
Forecasted precipitation type

Example:
rain
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
X-API-KEY
:
123
cell_index*
:
string
endTs
:
string
models
:
array
startTs
:
string
timezone
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/cells/{cell_index}/mm/forecast \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
[
  {
    "tz": "Europe/Athens",
    "date": "2024-01-17",
    "hourly": [
      {
        "timestamp": "2025-05-28T06:00:00.000Z",
        "precipitation": 2.5,
        "precipitation_probability": 80.5,
        "temperature": 25.7,
        "icon": "partly-cloudy-day",
        "wind_speed": 15.7,
        "wind_direction": 180,
        "humidity": 65.5,
        "pressure": 1013.2,
        "uv_index": 8.2,
        "feels_like": 27.3
      }
    ],
    "daily": {
      "temperature_max": 25.6,
      "temperature_min": 15.2,
      "precipitation_probability": 0.75,
      "precipitation_intensity": 2.5,
      "humidity": 65.5,
      "uv_index": 8.2,
      "pressure": 1013.2,
      "icon": "partly-cloudy-day",
      "precipitation_type": "rain",
      "wind_speed": 15.7,
      "wind_direction": 180,
      "timestamp": "2025-05-28T06:00:00.000Z"
    }
  }
]


Get 7 day WXMv2 forecast for a station
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/forecast/wxmv2
Retrieves 7 day WXMv2 forecast for a station for a specific weather variable. Weather variables are temperature, humidity, precipitation, wind_speed and wind_direction.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
The station to get the forecast for

Query Parameters
timezone
string
The timezone to get forecast for. Defaults to station location timezone

variable
string
required
The weather variable to get the forecast for. Accepted values are temperature, humidity, precipitation, wind_speed and wind_direction.

Responses
200
400
401
403
429
Hyperlocal forecast for the requested station

Body

application/json

application/json
Hyperlocal forecast

tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
required
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2024-01-17T15:00:00.000Z
variable
string
The weather variable requested

Example:
temperature
value
number<float>
The forecast value

Example:
25.7
X-API-KEY
:
123
station_id*
:
string
variable*
:
string
timezone
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/{station_id}/forecast/wxmv2 \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "tz": "Europe/Athens",
  "date": "2024-01-17",
  "hourly": [
    {
      "timestamp": "2024-01-17T15:00:00.000Z",
      "variable": "temperature",
      "value": 25.7
    }
  ]
}



Get 7 day WXMv3 forecast for a station
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/forecast/wxmv3
The WXMv3 is a highly accurate, high-resolution forecast generated by an advanced post-processing system that combines outputs from multiple global and regional numerical weather prediction (NWP) models.

Key Features:

Multi-model blending: Integrates data from over 40 different weather models, including ECMWF, GFS, and others.
Machine learning algorithms: Uses statistical and AI-based methods to optimize forecast accuracy by correcting systematic errors.
High-resolution output: Delivers detailed forecasts at resolutions down to 1 km, depending on the region.
Location-specific calibration: Forecasts are tailored using historical data and terrain-specific adjustments for hyper-local accuracy.
The WXMv3 is included in all platform plans with forecasts for a specific set of demo stations, 23fb0d80-438d-11ef-8e8d-b55568dc8e66, 52894530-4ead-11ed-960f-d7d4cf200cc9, df2c0430-512f-11ed-9972-4f669f2d96bd, while the Enterprise plan additionally provides WXMv3 forecast for one user-selected station. Contact us to get access to more stations.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
The station to get the forecast for

Query Parameters
timezone
string
The timezone to get forecast for. Defaults to station location timezone

Responses
200
400
403
429
MLM forecast for the requested station

Body

application/json

application/json
responses
/
200
Station weather observation

tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
precipitation
number<float>
Forecasted precipitation

Example:
2.5
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
80.5
temperature
number<float>
Forecasted temperature, in degrees Celsius

Example:
25.7
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
humidity
number<float>
Humidity

Example:
65.5
pressure
number<float>
Forecasted pressure, hPa

Example:
1013.2
uv_index
number<float>
Forecasted UV index

Example:
8.2
feels_like
number<float>
Forecasted feels like temperature, in degrees Celsius

Example:
27.3
daily
object
Station weather forecast

temperature_max
number<float>
Forecasted max temperature, in degrees Celsius

Example:
25.6
temperature_min
number<float>
Forecasted min temperature, in degrees Celsius

Example:
15.2
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
0.75
precipitation_intensity
number<float>
Forecasted precipitation intensity in mm

Example:
2.5
humidity
number<float>
Humidity

Example:
65.5
uv_index
number<float>
Forecasted UV index

Example:
8.2
pressure
number<float>
Forecasted pressure, in hPa

Example:
1013.2
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
precipitation_type
string
Forecasted precipitation type

Example:
rain
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
X-API-KEY
:
123
station_id*
:
string
timezone
:
string
Send API Request
curl --request GET \
  --url https://pro.weatherxm.com/api/v1/stations/{station_id}/forecast/wxmv3 \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "tz": "Europe/Athens",
  "date": "2024-01-17",
  "hourly": [
    {
      "timestamp": "2025-05-28T06:00:00.000Z",
      "precipitation": 2.5,
      "precipitation_probability": 80.5,
      "temperature": 25.7,
      "icon": "partly-cloudy-day",
      "wind_speed": 15.7,
      "wind_direction": 180,
      "humidity": 65.5,
      "pressure": 1013.2,
      "uv_index": 8.2,
      "feels_like": 27.3
    }
  ],
  "daily": {
    "temperature_max": 25.6,
    "temperature_min": 15.2,
    "precipitation_probability": 0.75,
    "precipitation_intensity": 2.5,
    "humidity": 65.5,
    "uv_index": 8.2,
    "pressure": 1013.2,
    "icon": "partly-cloudy-day",
    "precipitation_type": "rain",
    "wind_speed": 15.7,
    "wind_direction": 180,
    "timestamp": "2025-05-28T06:00:00.000Z"
  }
}


Get forecast models performance ranking per variable
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/fact/performance
Get forecast models performance ranking per variable. Supported variables are temperature, humidity, precipitation, windSpeed and windDirection.

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
The station to get the forecast performance for

Example:
0f7a89cb-123e-45d6-789f-0123456789ab
Query Parameters
variable
string
required
The weather variable to get the forecast for. Supported variables are temperature, humidity, precipitation, windSpeed and windDirection.

Example:
temperature
Responses
200
400
401
403
429
Forecast models performance ranking per variable for the requested station

Body

application/json

application/json
Forecast model with rank for a weather variable

errorMetric
string
The error metric used to calculate average error

Example:
RMSE
models
array[object]
Forecast model with rank for a weather variable

name
string
The name of the forecast model

Example:
GFS
rank
number
The rank of the forecast emodel compared with other forecast models in the dataset

Example:
1
avgErrorDistance
number
The average error for the forecasts from this model

Example:
2.3
errorDistance
array[number]
Detailed errors for the forecasts from this model for the analyzed period

Example:
[2.1,1.8,2.4,3.2,2.7,1.9,2.5,2.8]
X-API-KEY
:
123
station_id*
:
0f7a89cb-123e-45d6-789f-0123456789ab
variable*
:
temperature
Send API Request
curl --request GET \
  --url 'https://pro.weatherxm.com/api/v1/stations/0f7a89cb-123e-45d6-789f-0123456789ab/fact/performance?variable=temperature' \
  --header 'Accept: application/json' \
  --header 'X-API-KEY: 123'
{
  "errorMetric": "R",
  "models": [
    {
      "name": "GFS",
      "rank": 1,
      "avgErrorDistance": 2.3,
      "errorDistance": [
        2.1,
        1.8,
        2.4,
        3.2,
        2.7,
        1.9,
        2.5,
        2.8
      ]
    }
  ]
}


Get forecast models ranking for a station per weather variable
get
https://pro.weatherxm.com/api/v1/stations/{station_id}/fact/ranking
Get forecast models ranking for a station per weather variable

Request
Authentication via your WeatherXM Pro API key

An API key is a token that you provide when making API calls. Include the token in a header parameter called X-API-KEY.

Example: X-API-KEY: 123

Path Parameters
station_id
string
required
The station to get the forecast ranking for

Example:
0f7a89cb-123e-45d6-789f-0123456789ab
Responses
200
400
401
403
429
Forecast models ranking for the requested station

Body

application/json

application/json
responses
/
200
Model ranking per weather variable for a station

temperature
array[object]
Model ranking for the temperature weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

humidity
array[object]
Model ranking for the humidity weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

precipitation
array[object]
Model ranking for the precipitation weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

windSpeed
array[object]
Model ranking for the windSpeed weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

windDirection
array[object]
Model ranking for the windDirection weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"


Location
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
{
  "lat": 37.97168,
  "lon": 23.725697,
  "elevation": 1400
}

index
string
Cell index, based on H3 algorithm's index definition. Read more.

Example:
822d57fffffffff
center
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
station_count
integer
The number of stations in the cell

{
  "index": "822d57fffffffff",
  "center": {
    "lat": 37.97168,
    "lon": 23.725697,
    "elevation": 1400
  },
  "station_count": 0
}


Station
id
string
The station's unique identifier

Example:
04f39e90-f3ce-11ec-960f-d7d4cf200cc9
name
string
The station's unique name

cellIndex
string
The index of the Cell this station belongs to, based on H3 algorithm''s index definition. Read more.'

Example:
871eda664ffffff
location
object
lat
number<float>
Latitude

Example:
37.97168
lon
number<float>
Longitude

Example:
23.725697
elevation
number<float>
Elevation in meters

Example:
1400
createdAt
string
The ISO8601 datetime this station has observation data since.

{
  "id": "04f39e90-f3ce-11ec-960f-d7d4cf200cc9",
  "name": "string",
  "cellIndex": "871eda664ffffff",
  "location": {
    "lat": 37.97168,
    "lon": 23.725697,
    "elevation": 1400
  },
  "createdAt": "string"
}


Observation
Station weather observation

timestamp
string<date-time>
Timestamp of the observation, in ISO8601 datetime, with time zone

Example:
2024-03-20T15:30:00+02:00
temperature
number<float>
Temperature, in degrees Celsius

Example:
23.5
feels_like
number<float>
Felt temperature, in degrees Celsius

Example:
23.5
dew_point
number<float>
Dew point, in degrees Celsius

Example:
12.8
precipitation_rate
number<float>
Precipitation rate, in mm/h

Example:
12.8
precipitation_accumulated
number<float>
This field reports the total accumulated precipitation in millimeters (mm) as a continuously increasing counter that resets to 0 when it reaches its maximum value or on station reboot. To calculate daily precipitation, iterate over all the values and subtract each previous value from the current one to get the difference. if the current value is less than the previous (indicating a reset), assume the current value is the difference. Sum all differences over the day to get the total precipitation in mm.

Example:
150.4
humidity
number<float>
Relative humidity, percentage

Example:
65.4
wind_speed
number<float>
Wind speed, in m/s

Example:
4.2
wind_gust
number<float>
Wind gust, in m/s

Example:
8.7
wind_direction
integer
Wind direction, in degrees

Example:
180
uv_index
number
UV index

Example:
6.5
pressure
number<float>
Barometric pressure, in hPa

Example:
1013.2
solar_irradiance
number<float>
Solar irradiance, in watts per square metre (W/m²)

Example:
850.5
icon
string
Icon name corresponding to current weather conditions

Example:
partly-cloudy-day
{
  "timestamp": "2024-03-20T15:30:00+02:00",
  "temperature": 23.5,
  "feels_like": 23.5,
  "dew_point": 12.8,
  "precipitation_rate": 12.8,
  "precipitation_accumulated": 150.4,
  "humidity": 65.4,
  "wind_speed": 4.2,
  "wind_gust": 8.7,
  "wind_direction": 180,
  "uv_index": 6.5,
  "pressure": 1013.2,
  "solar_irradiance": 850.5,
  "icon": "partly-cloudy-day"
}


Health
timestamp
string<date-time>
Timestamp when the health metrics were calculated, in ISO8601 datetime

Example:
2024-03-20T15:30:00+02:00
data_quality
object
score
number<float>
The data quality score (percentage)

Example:
0.459
location_quality
object
score
number<float>
The location quality score (percentage)

Example:
0.459
reason
string
The location quality score (percentage) Possible reasons:

LOCATION_NOT_VERIFIED - Station's location could not be verified through the station's GPS sensor data
LOCATION_UNKNOWN - Station's location is unknown
Allowed values:
LOCATION_NOT_VERIFIED
LOCATION_UNKNOWN
{
  "timestamp": "2024-03-20T15:30:00+02:00",
  "data_quality": {
    "score": 0.459
  },
  "location_quality": {
    "score": 0.459,
    "reason": "LOCATION_NOT_VERIFIED"
  }
}


DailyForecastData
Station weather forecast

temperature_max
number<float>
Forecasted max temperature, in degrees Celsius

Example:
25.6
temperature_min
number<float>
Forecasted min temperature, in degrees Celsius

Example:
15.2
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
0.75
precipitation_intensity
number<float>
Forecasted precipitation intensity in mm

Example:
2.5
humidity
number<float>
Humidity

Example:
65.5
uv_index
number<float>
Forecasted UV index

Example:
8.2
pressure
number<float>
Forecasted pressure, in hPa

Example:
1013.2
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
precipitation_type
string
Forecasted precipitation type

Example:
rain
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
{
  "temperature_max": 25.6,
  "temperature_min": 15.2,
  "precipitation_probability": 0.75,
  "precipitation_intensity": 2.5,
  "humidity": 65.5,
  "uv_index": 8.2,
  "pressure": 1013.2,
  "icon": "partly-cloudy-day",
  "precipitation_type": "rain",
  "wind_speed": 15.7,
  "wind_direction": 180,
  "timestamp": "2025-05-28T06:00:00.000Z"
}


HourlyForecastData
Hourly forecast data

uv_index
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
precipitation
number<float>
Forecasted precipitation

Example:
2.5
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
80.5
temperature
number<float>
Forecasted temperature, in degrees Celsius

Example:
25.7
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
humidity
number<float>
Humidity

Example:
65.5
pressure
number<float>
Forecasted pressure, hPa

Example:
1013.2
uv_index
number<float>
Forecasted UV index

Example:
8.2
feels_like
number<float>
Forecasted feels like temperature, in degrees Celsius

Example:
27.3
{
  "timestamp": "2025-05-28T06:00:00.000Z",
  "precipitation": 2.5,
  "precipitation_probability": 80.5,
  "temperature": 25.7,
  "icon": "partly-cloudy-day",
  "wind_speed": 15.7,
  "wind_direction": 180,
  "humidity": 65.5,
  "pressure": 1013.2,
  "uv_index": 8.2,
  "feels_like": 27.3
}

HyperlocalHourlyForecastData
Hourly forecast data

timestamp
string<date-time>
required
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2024-01-17T15:00:00.000Z
variable
string
The weather variable requested

Example:
temperature
value
number<float>
The forecast value

Example:
25.7
{
  "timestamp": "2024-01-17T15:00:00.000Z",
  "variable": "temperature",
  "value": 25.7
}


Forecast
Station weather observation

tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
precipitation
number<float>
Forecasted precipitation

Example:
2.5
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
80.5
temperature
number<float>
Forecasted temperature, in degrees Celsius

Example:
25.7
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
humidity
number<float>
Humidity

Example:
65.5
pressure
number<float>
Forecasted pressure, hPa

Example:
1013.2
uv_index
number<float>
Forecasted UV index

Example:
8.2
feels_like
number<float>
Forecasted feels like temperature, in degrees Celsius

Example:
27.3
daily
object
Station weather forecast

temperature_max
number<float>
Forecasted max temperature, in degrees Celsius

Example:
25.6
temperature_min
number<float>
Forecasted min temperature, in degrees Celsius

Example:
15.2
precipitation_probability
number<float>
Forecasted precipitation probability

Example:
0.75
precipitation_intensity
number<float>
Forecasted precipitation intensity in mm

Example:
2.5
humidity
number<float>
Humidity

Example:
65.5
uv_index
number<float>
Forecasted UV index

Example:
8.2
pressure
number<float>
Forecasted pressure, in hPa

Example:
1013.2
icon
string
Icon representing forecasted weather conditions

Example:
partly-cloudy-day
precipitation_type
string
Forecasted precipitation type

Example:
rain
wind_speed
number<float>
Forecasted wind speed, in m/s

Example:
15.7
wind_direction
number<float>
Forecasted wind direction, in degrees

Example:
180
timestamp
string<date-time>
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2025-05-28T06:00:00.000Z
{
  "tz": "Europe/Athens",
  "date": "2024-01-17",
  "hourly": [
    {
      "timestamp": "2025-05-28T06:00:00.000Z",
      "precipitation": 2.5,
      "precipitation_probability": 80.5,
      "temperature": 25.7,
      "icon": "partly-cloudy-day",
      "wind_speed": 15.7,
      "wind_direction": 180,
      "humidity": 65.5,
      "pressure": 1013.2,
      "uv_index": 8.2,
      "feels_like": 27.3
    }
  ],
  "daily": {
    "temperature_max": 25.6,
    "temperature_min": 15.2,
    "precipitation_probability": 0.75,
    "precipitation_intensity": 2.5,
    "humidity": 65.5,
    "uv_index": 8.2,
    "pressure": 1013.2,
    "icon": "partly-cloudy-day",
    "precipitation_type": "rain",
    "wind_speed": 15.7,
    "wind_direction": 180,
    "timestamp": "2025-05-28T06:00:00.000Z"
  }
}


HyperlocalForecast
Hyperlocal forecast

tz
string
required
Timezone

Example:
Europe/Athens
date
string
required
Date for this forecast object

Example:
2024-01-17
hourly
array[object]
Hourly forecast data

timestamp
string<date-time>
required
Timestamp of the forecast, in ISO8601 datetime, with time zone

Example:
2024-01-17T15:00:00.000Z
variable
string
The weather variable requested

Example:
temperature
value
number<float>
The forecast value

Example:
25.7
{
  "tz": "Europe/Athens",
  "date": "2024-01-17",
  "hourly": [
    {
      "timestamp": "2024-01-17T15:00:00.000Z",
      "variable": "temperature",
      "value": 25.7
    }
  ]
}


ForecastModelWithRank
Forecast model with rank for a weather variable

name
string
The name of the forecast model

Example:
GFS
rank
number
The rank of the forecast emodel compared with other forecast models in the dataset

Example:
1
avgErrorDistance
number
The average error for the forecasts from this model

Example:
2.3
errorDistance
array[number]
Detailed errors for the forecasts from this model for the analyzed period

Example:
[2.1,1.8,2.4,3.2,2.7,1.9,2.5,2.8]
{
  "name": "GFS",
  "rank": 1,
  "avgErrorDistance": 2.3,
  "errorDistance": [
    2.1,
    1.8,
    2.4,
    3.2,
    2.7,
    1.9,
    2.5,
    2.8
  ]
}

ModelWithRank
Forecast model with rank for a weather variable

errorMetric
string
The error metric used to calculate average error

Example:
RMSE
models
array[object]
Forecast model with rank for a weather variable

name
string
The name of the forecast model

Example:
GFS
rank
number
The rank of the forecast emodel compared with other forecast models in the dataset

Example:
1
avgErrorDistance
number
The average error for the forecasts from this model

Example:
2.3
errorDistance
array[number]
Detailed errors for the forecasts from this model for the analyzed period

Example:
[2.1,1.8,2.4,3.2,2.7,1.9,2.5,2.8]
{
  "errorMetric": "R",
  "models": [
    {
      "name": "GFS",
      "rank": 1,
      "avgErrorDistance": 2.3,
      "errorDistance": [
        2.1,
        1.8,
        2.4,
        3.2,
        2.7,
        1.9,
        2.5,
        2.8
      ]
    }
  ]
}


FactModel
Weather forecast model with error value

name
string
Weather forecast model name

errorDistance
number
Weather forecast model error

{
  "name": "string",
  "errorDistance": 0
}


FactVariableRanking
Model ranking for weather forecast models per day ahead for a specific variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

name
string
Weather forecast model name

errorDistance
number
Weather forecast model error

{
  "daysAhead": 0,
  "model": {
    "name": "string",
    "errorDistance": 0
  }
}


ModelRanking
Model ranking per weather variable for a station

temperature
array[object]
Model ranking for the temperature weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

humidity
array[object]
Model ranking for the humidity weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

precipitation
array[object]
Model ranking for the precipitation weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

windSpeed
array[object]
Model ranking for the windSpeed weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

windDirection
array[object]
Model ranking for the windDirection weather variable

daysAhead
number
Days ahead from the forecast evaluation date

model
object
The best model for the "daysAhead"

{
  "temperature": [
    {
      "daysAhead": 0,
      "model": {}
    }
  ],
  "humidity": [
    {
      "daysAhead": 0,
      "model": {}
    }
  ],
  "precipitation": [
    {
      "daysAhead": 0,
      "model": {}
    }
  ],
  "windSpeed": [
    {
      "daysAhead": 0,
      "model": {}
    }
  ],
  "windDirection": [
    {
      "daysAhead": 0,
      "model": {}
    }
  ]
}


TodayData
Signed S3 URL to csv files containing data for all active stations in a specified 5 minute window and its corresponding datetime. Also give a Signed S3 URL to a QOD (Quality of Data) file for each date.

CSV Format for station files:
id,timestamp,temperature,humidity,precipitation_rate,precipitation_accumulated,wind_speed,wind_gust,wind_direction,pressure,solar_irradiance,uv_index,illuminance
Fields Description:
id: The station's unique identifier
timestamp: Date time at the end of the 5 minute window, in ISO8601 UTC datetime
temperature: Average temperature, in degrees Celsius, over the 5 minute window
humidity: Average relative humidity, percentage, over the 5 minute window
precipitation_rate: Precipitation rate, in mm, maximum over the 5 minute window
precipitation_accumulated: Total accumulated precipitation in millimeters (mm) from the start of the current date
wind_speed: Average wind speed, in m/s, over the 5 minute window
wind_gust: Maximum wind gust, in m/s, over the 5 minute window
wind_direction: Vector average wind direction, in degrees, over the 5 minute window
pressure: Average barometric pressure, in hPa, over the 5 minute window
solar_irradiance: Average solar irradiance, in watts per square metre (W/m²), over the 5 minute window
uv_index: Average of UV index, over the 5 minute window
illuminance: Average illuminance, in lux, over the 5 minute window
CSV Format for QOD files:
id, date, qod_score ### Fields Description:

id: The station's unique identifier
date: Date for the QOD score, in ISO8601 date
qod_score: The Quality of Data score (0-1, 1 being the best) for the station for that date
files
array[object]
Array of CSV file objects for each 5-minute window.

datetime
string
ISO8601 datetime string for the file

Example:
2025-09-30T00:10:00.000Z
url
string
Signed S3 URL for the file.

Example:
https://s3.amazonaws.com/csv/2025-09-30/00%3A10-00%3A15.csv
lastModified
string
The ISO8601 datetime the file was last modified.

Example:
2025-09-30T12:38:00.000Z
qod
array[object]
Array of QOD file objects for each date.

datetime
string
ISO8601 date string for the QOD file

Example:
2025-09-30
url
string
Signed S3 URL for the QOD file.

Example:
https://s3.amazonaws.com/csv/2025-09-30/qod.csv
{
  "files": [
    {
      "datetime": "2025-09-30T00:10:00.000Z",
      "url": "https://s3.amazonaws.com/csv/2025-09-30/00%3A10-00%3A15.csv",
      "lastModified": "2025-09-30T12:38:00.000Z"
    }
  ],
  "qod": [
    {
      "datetime": "2025-09-30",
      "url": "https://s3.amazonaws.com/csv/2025-09-30/qod.csv"
    }
  ]
}



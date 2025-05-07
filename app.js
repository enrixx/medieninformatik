const express = require("express");
const dotenv = require("dotenv");
const pg = require("pg");
const bodyParser = require("body-parser");
const {request, response} = require("express");
const session = require("express-session");
const axios = require("axios");
const functions = require("./serverScript/weatherFunctions.js");

/* Reading global variables from config file */
dotenv.config();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const PORT = process.env.PORT;
const CON_STRING = process.env.DB_CON_STRING;

if (CON_STRING === undefined) {
    console.log("Error: Environment variable DB_CON_STRING not set!");
    process.exit(1);
}

pg.defaults.ssl = true;
var dbClient = new pg.Client(CON_STRING);

dbClient.connect();

var urlencodedParser = bodyParser.urlencoded({extended: false});

app = express();

app.use(session({
    secret: "This is a secret!", cookie: {maxAge: 24 * 60 * 60 * 1000}, resave: false, saveUninitialized: false
}));

//turn on serving static files (required for delivering css to client)
app.use(express.static("public"));
//configure template engine
app.set("views", "views");
app.set("view engine", "pug");


app.get('/', (req, res) => {
    res.render("index", {
        user: req.session.user
    });
});

app.get('/details/:id', (req, res) => {
    let id = req.params.id;

    if (req.session.user === undefined) {
        res.redirect("/");
    } else {
        // Get station and make sure it exists
        dbClient.query("SELECT * FROM stations WHERE id = $1", [id], function (dbError, dbStationResponse) {
            if (dbStationResponse.rows.length === 0) {
                res.render("error", {
                    error: "Station does not exist",
                    user: req.session.user
                });
            } else if (req.session.user !== dbStationResponse.rows[0].user_id) {
                res.render("error", {
                    error: "Not your station",
                    user: req.session.user
                });
            } else {
                // Get all weather data
                // Get max min data with subqueries
                dbClient.query("SELECT weatherdata.id, weatherdata.weather_code, weatherdata.temperatur, weatherdata.wind, weatherdata.times, weatherdata.pressure, weatherdata.winddirection, stations.name, stations.x, stations.y, stations.user_id, aggregated_data.max_temperature, aggregated_data.min_temperature, aggregated_data.max_wind, aggregated_data.min_wind, aggregated_data.max_pressure, aggregated_data.min_pressure FROM weatherdata LEFT JOIN stations ON weatherdata.station_id = stations.id LEFT JOIN ( SELECT station_id, MAX(temperatur) AS max_temperature, MIN(temperatur) AS min_temperature, MAX(wind) AS max_wind, MIN(wind) AS min_wind, MAX(pressure) AS max_pressure, MIN(pressure) AS min_pressure FROM weatherdata WHERE station_id = $1 GROUP BY station_id )AS aggregated_data ON stations.id = aggregated_data.station_id WHERE stations.id = $1 ORDER BY weatherdata.id DESC", [id], function (dbError, dbWeatherResponse) {
                    if (dbWeatherResponse.rows.length === 0) {
                        res.render("details", {
                            station: dbStationResponse.rows[0],
                            weatherdata: dbWeatherResponse.rows,
                            user: req.session.user
                        });
                    } else {

                        //if there is a second reading then change arrow, else fill arrows with right arrows

                        let temperatureArrow = dbWeatherResponse.rows[1] ? functions.Arrow(dbWeatherResponse.rows[0].temperatur, dbWeatherResponse.rows[1].temperatur) : "/img/arrow-right.svg";
                        let windArrow = dbWeatherResponse.rows[1] ? functions.Arrow(dbWeatherResponse.rows[0].wind, dbWeatherResponse.rows[1].wind) : "/img/arrow-right.svg";
                        let pressureArrow = dbWeatherResponse.rows[1] ? functions.Arrow(dbWeatherResponse.rows[0].pressure, dbWeatherResponse.rows[1].pressure) : "/img/arrow-right.svg";

                        res.render("details", {
                            station: dbStationResponse.rows[0],
                            weatherdata: dbWeatherResponse.rows,
                            weatherNew: functions.WeatherConverter(dbWeatherResponse.rows[0].weather_code),
                            windNew: functions.WindDirection(dbWeatherResponse.rows[0].winddirection),
                            weatherIcon: functions.WeatherIcon(dbWeatherResponse.rows[0].weather_code),
                            temperatureIcon: functions.TemperatureIcon(dbWeatherResponse.rows[0].temperatur),
                            temperatureArrow,
                            windArrow,
                            pressureArrow,
                            user: req.session.user
                        });
                    }
                });
            }
        });
    }
});

app.get('/delete/station/:id', (req, res) => {
    let id = req.params.id;

    if (req.session.user === undefined) {
        res.redirect("/")
    } else {
        // Get station and make sure it exists
        dbClient.query("SELECT * FROM stations WHERE id = $1", [id], function (dbError, dbStationResponse) {
            if (dbStationResponse.rows.length === 0) {
                res.render("error", {
                    error: "Station does not exist", user: req.session.user
                });
            } else if (req.session.user !== dbStationResponse.rows[0].user_id) {
                res.render("error", {
                    error: "Cannot delete others station", user: req.session.user
                })
            } else {
                // Delete all data
                dbClient.query("DELETE FROM weatherdata WHERE station_id = $1", [id], function (dbError, dbWeatherResponse) {
                });
                dbClient.query("DELETE FROM stations WHERE id = $1", [id], function (dbError, dbWeatherResponse) {
                    res.redirect("/dashboard");
                });
            }
        });
    }
});

app.get('/delete/reading/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Check if user is logged in
        if (req.session.user === undefined) {
            return res.redirect("/");
        }

        // Get the station data
        const {rows: [stationData]} = await dbClient.query(
            "SELECT * FROM weatherdata JOIN stations ON weatherdata.station_id = stations.id WHERE weatherdata.id = $1",
            [id]
        );

        // Check if the stationData is undefined or null
        if (!stationData || !stationData.user_id) {
            return res.render("error", {
                error: "Data does not exist",
                user: req.session.user
            });
        }

        // Check if the logged-in user is the owner of the station
        if (req.session.user !== stationData.user_id) {
            return res.render("error", {
                error: "Cannot delete others reading",
                user: req.session.user
            });
        }

        // Delete the reading from weatherdata
        await dbClient.query("DELETE FROM weatherdata WHERE weatherdata.id = $1", [id]);

        // Redirect to the details page with the station_id
        res.redirect("/details/" + stationData.station_id);
    } catch (error) {
        // Handle errors
        res.render("error", {
            error: error.message,
            user: req.session.user
        });
    }
});

app.get("/dashboard", (req, res) => {
    if (req.session.user === undefined) {
        res.redirect("/")
    } else {
        //use DISTINCT ON (s.id) to ensure that only one row is returned per unique stations.id value.
        //get max min data with subqueries
        dbClient.query("SELECT DISTINCT ON (s.id) w.*, wd.max_temperature, wd.min_temperature, wd.max_wind, wd.min_wind, wd.max_pressure, wd.min_pressure, s.*, last_temps.newtemperature, last_temps.oldtemperature, last_pressure.newpressure, last_pressure.oldpressure, last_wind.newwind, last_wind.oldwind FROM weatherdata w RIGHT JOIN stations s ON w.station_id = s.id LEFT JOIN (SELECT station_id, MAX(CASE WHEN rn = 1 THEN temperatur END) AS newtemperature, MAX(CASE WHEN rn = 2 THEN temperatur END) AS oldtemperature FROM (SELECT station_id, temperatur, ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY id DESC) AS rn FROM weatherdata) AS temp WHERE rn <= 2 GROUP BY station_id) AS last_temps ON s.id = last_temps.station_id LEFT JOIN (SELECT station_id, MAX(CASE WHEN rn = 1 THEN pressure END) AS newpressure, MAX(CASE WHEN rn = 2 THEN pressure END) AS oldpressure FROM (SELECT station_id, pressure, ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY id DESC) AS rn FROM weatherdata) AS temp2 WHERE rn <= 2 GROUP BY station_id) AS last_pressure ON s.id = last_pressure.station_id LEFT JOIN ( SELECT station_id, MAX(CASE WHEN rn = 1 THEN wind END) AS newwind, MAX(CASE WHEN rn = 2 THEN wind END) AS oldwind FROM (SELECT station_id, wind, ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY id DESC) AS rn FROM weatherdata) AS temp3 WHERE rn <= 2 GROUP BY station_id) AS last_wind ON s.id = last_wind.station_id LEFT JOIN (SELECT station_id, MAX(temperatur) AS max_temperature, MIN(temperatur) AS min_temperature, MAX(wind) AS max_wind, MIN(wind) AS min_wind,MAX(pressure) AS max_pressure, MIN(pressure) AS min_pressure FROM weatherdata GROUP BY station_id) AS wd ON s.id = wd.station_id WHERE s.user_id = $1 ORDER BY s.id, w.id DESC", [req.session.user], function (dbError, dbResponse) {
            if (dbError) {
                res.render("error", {
                    error: "Error", user: req.session.user
                });
            } else {
                let weatherNameArray = [];
                let weatherIconArray = [];
                let temperatureIconArray = [];
                let temperatureArrowArray = [];
                let windDirectionArray = [];
                let windArrowArray = [];
                let pressureArrowArray = [];

                for (let i = 0; i < dbResponse.rows.length; i++) {
                    weatherNameArray[i] = functions.WeatherConverter(dbResponse.rows[i].weather_code);
                    weatherIconArray[i] = functions.WeatherIcon(dbResponse.rows[i].weather_code);
                    temperatureIconArray[i] = functions.TemperatureIcon(dbResponse.rows[i].temperatur);
                    temperatureArrowArray [i] = functions.Arrow(dbResponse.rows[i].newtemperature, dbResponse.rows[i].oldtemperature);
                    windDirectionArray [i] = functions.WindDirection(dbResponse.rows[i].winddirection);
                    windArrowArray [i] = functions.Arrow(dbResponse.rows[i].newwind, dbResponse.rows[i].oldwind);
                    pressureArrowArray [i] = functions.Arrow(dbResponse.rows[i].newpressure, dbResponse.rows[i].oldpressure);
                }

                res.render("dashboard", {
                    stations: dbResponse.rows,
                    weatherNew: weatherNameArray,
                    weatherIcons: weatherIconArray,
                    temperatureIcons: temperatureIconArray,
                    temperatureArrows: temperatureArrowArray,
                    windNew: windDirectionArray,
                    windArrows: windArrowArray,
                    pressureArrows: pressureArrowArray,
                    user: req.session.user
                });
            }
        });
    }
});

app.get('/signup', (req, res) => {
    res.render("signup")
});

app.get("/logout", (req, res) => {
    req.session.destroy(function (error) {
        if (error) {
            res.render("error", {
                error: "Could not logout"
            })
        } else {
            res.redirect("/")
        }
    });
});

app.post("/dashboard", urlencodedParser, (req, res) => {
    dbClient.query("INSERT INTO stations (name, x, y, user_id) VALUES ($1,$2,$3,$4)", [req.body.name, req.body.x, req.body.y, req.session.user], function (dbError, dbAddStation) {
        res.redirect("/dashboard")
    });
});

app.post("/details/:id", urlencodedParser, (req, res) => {
    dbClient.query("INSERT INTO weatherdata (station_id, weather_code, temperatur, wind, winddirection, pressure, times) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)", [req.params.id, req.body.code, req.body.temperatur, req.body.speed, req.body.direction, req.body.pressure], function (dbError, dbAddStation) {
        res.redirect("back")
    });
});

app.post("/login", urlencodedParser, (req, res) => {
    dbClient.query("SELECT * FROM users WHERE email = $1 AND password = $2", [req.body.email, req.body.password], function (dbError, dbLogin) {
        if (dbLogin.rows.length === 0) {
            res.render("index", {
                login_error: "Sorry, username and password do not match!"
            })
        } else {
            req.session.user = dbLogin.rows[0].id
            res.redirect("/dashboard")
        }
    });
});

app.post("/signup", urlencodedParser, (req, res) => {

    dbClient.query("SELECT email FROM users WHERE email = $1", [req.body.email], function (dbError, dbSignupDouble) {
        if (dbSignupDouble.rows.length === 0) {
            dbClient.query("INSERT INTO users (email, vorname, nachname, password) VALUES ($1,$2,$3,$4)", [req.body.email, req.body.vorname, req.body.nachname, req.body.password], function (dbError, dbSignup) {
                res.redirect("/")
            })
        } else {
            res.render("error", {
                error: "This email has already been used",
                user: req.session.user
            })
        }
    });
});


app.get("/details/api/add/:id", async (req, res) => {
    try {
        let dbResponse = await dbClient.query("SELECT name from stations WHERE id = $1", [req.params.id]);

        if (dbResponse.rows.length === 0) {
            res.render("error", {
                error: "Station not found",
                user: req.session.user
            })
        }

        let cityName = encodeURIComponent(dbResponse.rows[0].name);
        let url = `http://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.API_KEY}&units=metric`;

        let response = await axios.get(url);
        let weatherData = response.data;

        await dbClient.query("INSERT INTO weatherdata (station_id, weather_code, temperatur, wind, pressure, winddirection, times) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)",
            [req.params.id, weatherData.weather[0].id, weatherData.main.temp, weatherData.wind.speed, weatherData.main.pressure, weatherData.wind.deg]);

        res.redirect("back");
    } catch (error) {
        res.render("error", {
            error: "Internal Server Error",
            user: req.session.user
        })
    }
});

app.get('/stations/renderGraph/:stationName', urlencodedParser, async (req, res) => {
    try {
        let url = `http://api.openweathermap.org/data/2.5/forecast?q=${req.params.stationName}&appid=${process.env.API_KEY}&units=metric`;
        let response = await fetch(url);
        if (response.status === 200) {
            const responseData = await response.json();
            let temp = [];
            let wind = [];
            let text = [];
            for (let i = 5; i < responseData.list.length; i += 8) {
                temp.push(responseData.list[i].main.temp);
                wind.push(responseData.list[i].wind.speed);
                text.push(responseData.list[i].dt_txt);
            }
            const data = {
                labels: text,
                datasets: [
                    {name: 'Temperatur', values: temp},
                    {name: 'Windgeschwindigkeit', values: wind}
                ]
            };
            res.send(data);
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        res.render("error", {
            error: "Internal Server Error / API request failed",
            user: req.session.user
        })
    }
});

app.listen(PORT, function () {
    console.log(`Weathertop running and listening on port ${PORT}`);
});

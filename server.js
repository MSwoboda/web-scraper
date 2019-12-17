var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");

var db = require("./models");

var PORT = process.env.PORT || 8080;

var app = express();

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/articleDB";

mongoose.connect(MONGODB_URI);

app.get("/", (req, res) => {

  db.Article.find({})
    .then((dbArticle) => {
      // console.log(dbArticle);
      //       article = { title: "Hello", link: "doggo" };
      // console.log(article);

      res.render("index", {
        article: dbArticle
      });
    })
    .catch((err) => { console.log(err) })

});

app.get("/remove", (req, res) => {
  db.Article.deleteMany({})
    .then(res.render("index"))
    .catch(err => { res.json(err) })
});

app.get("/scrape", function (req, res) {
  axios.get("https://news.ycombinator.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("td.title").each(function (i, element) {
      // Save an empty result object
      var result = {};

      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then((dbArticle) => { console.log(dbArticle) })
        .catch((err) => { console.log(err) })
    });

    // Send a message to the client
    res.redirect("/");
  });
});

app.get("/articles", (req, res) => {
  db.Article.find({})
    .then(dbArticle => { res.json(dbArticle) })
    .catch(err => { res.json(err) })
});

app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(dbArticle => res.json(dbArticle))
    .catch(err => res.json(err))
});


app.get("/delete/:id", function (req, res) {
  db.Article.deleteOne({ _id: req.params.id })
    .then(dbArticle => res.redirect("/"))
    .catch(err => res.redirect("/"))
});

app.post("/articles/:id", (req, res) => {
  db.Note.create(req.body)
    .then(dbNote => { return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true }); })
    .then(dbArticle => { res.json(dbArticle) })
    .catch(err => res.json(err))
});

app.listen(PORT, () => { console.log("App running on port " + PORT + "!") });

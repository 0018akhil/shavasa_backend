const { MongoClient, ObjectId } = require("mongodb");

let client_db = null;
const uri =
  "mongodb+srv://" +
  process.env.DB_USERNAME +
  ":" +
  process.env.DB_PASSWORD +
  "@cluster0.2x3kk.mongodb.net/";

// Function to connect to MongoDB
function connectToMongo() {
  if (!client_db) {
    try {
      let client = new MongoClient(uri);
      client_db = client.db("shvasaDatabase");
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Error connecting to MongoDB: ", err);
      process.exit(1);
    }
  }
  return client_db;
}

module.exports = { database: connectToMongo(), ObjectId };
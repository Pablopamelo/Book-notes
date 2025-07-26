import axios from "axios";
import pg from "pg";
import express, {response} from "express";
import bodyParser from "body-parser";

const app = express();

const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new pg.Client({
  host: "localhost",
	user: "postgres",
	database: "bookNotes",
	password: "0kbIKir6",
	port: 5432,
});

app.get("/", async (req,res) => {
	res.render("index.ejs");
});

app.listen(port, () => {
	console.log(`Server running at port: ${port}`);
});
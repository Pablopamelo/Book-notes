import axios from "axios";
import pg, { Result } from "pg";
import express, {response} from "express";
import bodyParser from "body-parser";

const app = express();

const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.set('view engine', 'ejs');

const db = new pg.Client({
    host: "localhost",
	user: "postgres",
	database: "bookNotes",
	password: "0kbIKir6",
	port: 5432,
});

db.connect();

const books = [];

let currentUserId = 1;

app.get("/", async (req, res) => { 
	try{
		response = await db.query("SELECT * FROM books AS b JOIN users AS u ON b.id = u.id WHERE u.id = $1",[currentUserId]); // Gets books data from database for a current user 
		books = response.rows;
	}catch(error){
		console.log(error);
	}
	res.render("index.ejs", {books: books});
});

app.get("/new/:id", (req,res) => {
	const id = req.params.id;
	if(id !== 0){
		const book = books.find((book) => id === book.id);
		res.render("addBook.ejs",{book});
	}else{
		res.render("addBook.ejs");
	}
});

app.post("/add", (req,res) => {
	try{

	}catch(error){
		console.log(error);
	}
});

app.post("/edit/:id", (req,res) => {
	try{

	}catch(error){
		console.log(error);
	}
});

app.post("/delete/:id", (req,res) => {
	try{

	}catch(error){
		console.log(error);
	}
});

app.listen(port, () => {
	console.log(`Server running at port: ${port}`);
});
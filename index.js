import axios from "axios";
import pg, { Result } from "pg";
import express, {response} from "express";
import bodyParser from "body-parser";

const app = express();

const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.json());

app.set('view engine', 'ejs');

const db = new pg.Client({
    host: "localhost",
	user: "postgres",
	database: "bookNotes",
	password: "0kbIKir6",
	port: 5432,
});

db.connect();

let books = [];

let currentUserId = 1;

async function getCover(title){
	let response;
	try{
		response = await axios.get("https://openlibrary.org/search.json",{
			params:{
				q: title,
			},
		});
	}catch(error){
		console.log(error);
	}
		
	const bookData = response.data.docs?.[0];
	const cover_olid = bookData.cover_edition_key;	
	let cover_url;

	if(cover_olid === '' || cover_olid == "undefined"){
		cover_url = "https://salonlfc.com/wp-content/uploads/2018/01/image-not-found-scaled.png";
	}else{
		cover_url = `https://covers.openlibrary.org/b/olid/${cover_olid}.jpg`;
	}
	return cover_url;
}

app.get("/", async (req, res) => { 
	try{
		const response = await db.query("SELECT b.id, b.title, b.rating, b.cover FROM books AS b JOIN users AS u ON b.user_id = u.id WHERE u.id = $1",[currentUserId]); // Gets books data from database for a current user 
		books = response.rows;
	}catch(error){
		console.log(error);
	}
	res.render("index.ejs", {books: books});
});

app.post("/new/:id", (req,res) => {
	const id = parseInt(req.params.id);
	if(id !== 0){
		const book = books.find((book) => id === book.id);
		res.render("addBook.ejs",{book});
	}else{
		res.render("addBook.ejs",{book: null});
	}
});

app.post("/add", async (req,res) => {
	try{
		const title = req.body.title;
		const rating = req.body.rating;
	
		let cover_url = getCover(title);	

		await db.query("INSERT INTO books(title,rating,cover,user_id) VALUES($1,$2,$3,$4)",
		[title, rating, cover_url, currentUserId]);

	}catch(error){
		console.log(error);
	}
	res.redirect("/");
});

app.post("/edit/:id", async (req,res) => {
	try{
		const id = req.params.id;
		const title = req.body.title;
		const rating = req.body.rating;

		let cover_url = getCover(title);

		await db.query(`UPDATE books SET title = $1, rating = $2, cover = $3 WHERE id = $4`,[title, rating, cover_url, id])
		
	}catch(error){
		console.log(error);
	}
	res.redirect("/");
});

app.post("/delete/:id", async (req,res) => {
	try{
		const id = req.params.id;
		db.query("DELETE FROM books WHERE id = $1",
		[id]);
	}catch(error){
		console.log(error);
	}
	res.redirect("/");
});

app.post("/cover", async (req,res) => {
	const title = req.body.title;

	let cover_url = await getCover(title);

	res.json(cover_url);
});

app.listen(port, () => {
	console.log(`Server running at port: ${port}`);
});
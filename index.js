import axios from "axios";
import pg, { Result } from "pg";
import express, {response} from "express";
import bodyParser from "body-parser";
import EventEmitter from 'events';
import { get } from "http";
import dotenv from 'dotenv';

const app = express();

const emitter = new EventEmitter;
emitter.setMaxListeners(11);

const port = 3000;

dotenv.config();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.json());

app.set('view engine', 'ejs');

const db = new pg.Client({
    host: "localhost",
	user: "postgres",
	database: "bookNotes",
	password: process.env.PASSWORD,
	port: 5432,
});

db.connect();

let currentUserId = 1;

async function getBook(title){
	try{
		const response = await axios.get("https://openlibrary.org/search.json",{
			params:{
				q: title,
			},
		});
		const book = response.data.docs?.[0];
		return book;
	}catch(error){
		console.log(error);
		return 0;
	}
}

async function getCover(title){
	const book = await getBook(title);

	if(book){
		const cover_olid = book.cover_edition_key;	

		let cover_url = `https://covers.openlibrary.org/b/olid/${cover_olid}-L.jpg`;
		
		return cover_url;
	}else{
		return "Img not found";
	}
}

async function getBooks(){
	let books;
	try{
		const response = await db.query("SELECT id, title, rating, cover, author FROM books WHERE user_id = $1",
		[currentUserId]);
		books = response.rows;
	}catch(error){
		console.log(error);
	}
	return books;
}

async function getNotes(id){
	let notes;
	try{
		const response = await db.query("SELECT n.id, n.noteTitle, n.noteContent, n.note_date FROM notes AS n JOIN books AS b ON n.book_id = b.id WHERE b.user_id = $1 AND b.id = $2 ORDER BY n.note_date DESC",
		[currentUserId, id]);
		notes = response.rows;
	}catch(error){
		console.log(error);
	}
	return notes;
}

function getDate(){
	const date = new Date();
	let seconds = date.getSeconds();
	let minutes = date.getMinutes();
	let houres = date.getHours();
	let day = date.getDate();
	let month = date.getMonth() + 1;
	let year = date.getFullYear();

	let yearArray = [seconds, minutes, houres, day, month, year];

	yearArray.forEach((element, index) => {
		(element < 10 ? yearArray[index] = "0" + element : element);
	});

	const finalDate = yearArray[2] + ":" + yearArray[1] + ":" + yearArray[0] + " " + yearArray[3] + "." + yearArray[4]+ "." + yearArray[5];

	return finalDate;
}

app.get("/", async (req, res) => { 
	const books = await getBooks();
	res.render("index.ejs", {books: books});
});

app.get("/book/:id", async (req,res) =>{
	const id = parseInt(req.params.id);

	const books = await getBooks();
	const notes = await getNotes(id);

	notes.forEach(note => {
		const date = new Date(note.note_date);

		const pad = (n) => n.toString().padStart(2, '0');

		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());
		const seconds = pad(date.getSeconds());

		const day = pad(date.getDate());
		const month = pad(date.getMonth() + 1);
		const year = date.getFullYear();

		note.note_date = `${hours}:${minutes}:${seconds} ${day}.${month}.${year}`;
	});

	const book = books.find((book) => id === book.id);

	if (!book) {
    return res.status(404).send("Book not found");
}

	res.render("book.ejs", {notes, book});
});

app.post("/new/:id", async (req,res) => {
	const books = await getBooks();
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

		const book = await getBook(title);

		const author = book.author_name?.[0];
	
		let cover_url = await getCover(title);	

		await db.query("INSERT INTO books(title, rating, cover, user_id, author) VALUES($1,$2,$3,$4,$5)",
		[title, rating, cover_url, currentUserId, author]);

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

		let cover_url = await getCover(title);

		await db.query(`UPDATE books SET title = $1, rating = $2, cover = $3 WHERE id = $4`,
		[title, rating, cover_url, id])
		
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

app.post("/noteAdd/:id", async (req,res) => {
	const id = parseInt(req.params.id);
	const title = req.body.title;
	const content = req.body.content;

	const date = getDate();

	db.query("INSERT INTO notes(notetitle, notecontent, note_date, book_id) VALUES($1,$2,TO_TIMESTAMP($3, 'HH24:MI:SS DD.MM.YYYY'),$4)",
	[title, content, date, id]);

	res.redirect(`/book/${id}`);
});

app.post("/noteDelete/:bId/:nId", async (req,res) => {
	const bId = req.params.bId;
	const nId = req.params.nId;

	try{
		db.query("DELETE FROM notes WHERE id = $1",[nId]);
	}catch(error){
		console.log(error);
	}

	res.redirect(`/book/${bId}`);
});

app.patch("/noteEdit/:id", async (req,res) => {
	const id = req.params.id;
	const title = req.body.title;
	const content = req.body.content;

	console.log(title);
	console.log(content);

	let response;

	const date = getDate();

	try{
		db.query("UPDATE notes SET noteTitle = $1, noteContent = $2, note_date = TO_TIMESTAMP($3, 'HH24:MI:SS DD.MM.YYYY') WHERE id = $4",
		[title, content, date, id]);
		
		response = {
			id: id,
			title: title,
			content: content,
			date: date
		}

	}catch(error){
		console.log(error);
	}
	res.json(response);
});

app.listen(port, () => {
	console.log(`Server running at port: ${port}`);
});
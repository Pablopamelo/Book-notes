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

	let cover_url = `https://covers.openlibrary.org/b/olid/${cover_olid}-L.jpg`;

	return cover_url;
}

async function getBooks(){
	let books;
	try{
		const response = await db.query("SELECT id, title, rating, cover FROM books WHERE user_id = $1",
		[currentUserId]); // Gets books data from database for a current user 
		books = response.rows;
	}catch(error){
		console.log(error);
	}
	return books;
}

async function getNotes(){
	let notes;
	try{
		const response = await db.query("SELECT n.id, n.noteTitle, n.noteContent, n.note_date FROM notes AS n JOIN books AS b ON n.book_id = b.id WHERE b.user_id = $1",
		[currentUserId]);
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
	const date = getDate();
	console.log(date);
	res.render("index.ejs", {books: books});
});

app.get("/book/:id", async (req,res) =>{
	const books = await getBooks();
	let notes = await getNotes();
	notes = [
			{
				id: 1,
				noteTitle: "bimbom",
				noteContent: "aoihwdoahwdikhawudgaiuwhd aiwhd iuahjwdiahwd",
				note_date: "today" 
			},
		];
	const id = parseInt(req.params.id);
	const book = books.find((book) => id === book.id);
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
	
		let cover_url = await getCover(title);	

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

app.post("/noteAdd", async (req,res) => {
	const title = req.body.title;
	const content = req.body.content;

	const date = getDate();

	db.query("INSERT INTO notes(noteTitle, noteContent, note_date) VALUES($1,$2,$3)",
	[title, content, date]);

	redirect(`/book/${id}`);
});

app.post("/noteDelete/:id", async (req,res) => {
	const id = req.params.id;

	try{
		db.query("DELETE FROM notes WHERE id = $1",[id]);
	}catch(error){
		console.log(error);
	}

	redirect(`/book/${id}`);
});

app.patch("/noteEdit/:id", async (req,res) => {
	const id = req.params.id;
	const title = req.body.title;
	const content = req.body.content;
	let response;

	const date = getDate();

	try{
		db.query("UPDATE notes SET(noteTitle = $1, noteContent = $2, note_date = $3 WHERE id = $4)",
		[title, content, date, id]);
		
		response = {
			id: id,
			title: title,
			content: content,
			date: finalDate
		}

	}catch(error){
		console.log(error);
	}
	res.json(response);
});

app.listen(port, () => {
	console.log(`Server running at port: ${port}`);
});
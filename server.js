const assert = require('assert');
const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');

var options = {
	key: fs.readFileSync('/etc/ssl/private/licinfo-node.recherche.int.univ-jfc.fr.key'),
	cert : fs.readFileSync('/etc/ssl/my.certs/licinfo-node.cert')
};

const app = express();

const Datastore = require('nedb');

var usersDB = new Datastore({filename:'users.db', autoload:true});

var questionsDB = new Datastore({filename:'questions.db', autoload:true});

app.use(express.static('static'));
app.use(bodyParser.urlencoded({extended: false}));
//app.use(bodyParser.json());


// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

app.get('/checkin', function(req, res) {
	if (!req.query.id) return;
	usersDB.findOne({_id: req.query.id}, function(err, doc) {
		if (!doc) {
			//user first login
			usersDB.insert({_id: req.query.id, visits:[{stamp: new Date()}]}, function(err, newDoc) {
					if (err) res.send({retcode:-1, message: err});
					res.send({status:0, message: "Document created for new user "+req.query.id});
			});
		} else {
			//update current user
			usersDB.update({_id: req.query.id}, {$push: {visits: {stamp: new Date()}}}, function() {
				res.send({status:0, message: "Document updated for returning user "+req.query.id});
			});
		}
	});
});

app.get('/history', function(req, res) {
	if (!req.query.id) res.send({status:-1, message:'User unknown'});
	usersDB.findOne({_id: req.query.id}, function(err, doc) {
		res.send(doc.visits);
	});
});

app.get('/all', function(req, res) {
	usersDB.find({}, function(err, docs) {
		res.send(docs);
	});
});

app.get('/questions', function(req, res) {
	
	var n = req.query.n;
	
	questionsDB.find({}, function(err, docs) {
		if (err) res.send({status:-1, message:"Something wrong happened"});
		else {
			var questions = [];
			let rand = -1;
			while (n>0) {
				do {
					rand = Math.floor(Math.random() * docs.length); 
				} while (docs[rand].alreadyIn);
				let question = docs[rand];
				//remove attrs 'correct' 
				for (a in question.answers) {
					delete question.answers[a].correct;
				}
				questions.push(question);
				docs[rand].alreadyIn = true;
				n=n-1;
			}
			res.send({status:0, data:questions});		
		}
	});
});


app.get("/rewriteQuestions", function(req, res) {
	//!\ Important: backslashes must be escaped \ -> \\
	var q1 = {
		_id:"q2019-02.1",
		lib:"Vrai ou Faux. L'équation $ax^2+bx+c=0$ est une équation du second degré.",
		answers:[
			{lib:"Vrai"},
			{lib:"Faux, elle n'est pas de la forme $\\displaystyle{\\sum_{i=0}^n \\frac{n^2+n}{2}}$"},
			{lib:"C'est de l'humour ?"},
			{lib:"Je quitte la fac"}
		],
		multiple:false,
		correct: 0
	};
	var q2 = {
		_id:"q2019-02.2",
		lib:"Parmi les polynômes suivants, lesquels sont de degré 2 ?",
		answers:[
			{lib:"$p_1(x)=2$"},
			{lib:"$p_2(x)=x^2+5x-7$",correct:true},
			{lib:"$p_3(2)=x^4+1$"},
			{lib:"$p_4(x)=3x^3+2x^2$"}
		],
		multiple:true
	};
	var q3 = {
		_id:"q2019-02.3",
		lib:"Quels résultats sont corrects pour l'opération $\\frac{1}{4}\\times\\frac{1}{2}$ ?",
		answers:[
			{lib:"$\\frac{1}{8}$",correct:true},
			{lib:"$\\frac{1}{6}$"},
			{lib:"$0,125$",correct:true},
			{lib:"$2\\pi{}R$"}
		],
		multiple:true
	};
	questionsDB.insert(q1);
	questionsDB.insert(q2);
	questionsDB.insert(q3);
	res.send('ok');
});

app.post('/sendUserInput', function(req, res) {
	//Log user attempt on this question
	usersDB.insert({user:req.body.userId, question:req.body.idQuestion, time:new Date()});
	//Process user inputs	
	questionsDB.findOne({_id: req.body.idQuestion}, function(err, doc) {
		if (err) res.send({status:-1, message:'unknown question id'});
		else {
			if (doc.multiple) {
				let corrects = doc.answers;
				for (a in corrects) {
					delete corrects[a].lib;
					corrects[a].user = req.body[a];
				}
				res.send({status:0, data:corrects});
			} else {
				res.send({status:0, data:{user: req.body.group, correct: doc.correct}});
			}
		}
	});
});

https.createServer(options, app).listen(443, function() {
	console.log("Server is up and running...");
});



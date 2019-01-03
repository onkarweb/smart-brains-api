const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'root',
    database : 'smartbrain'
  }
});



const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
	console.log('Request for root /')
	res.json('lol');
})

app.post('/signin', (req, res) => {
	const {email, password} = req.body;  //using destructuring
	if(!email || !password){
		return req.status(400).json('invalid form submission');
	}
	console.log("The input credential are ",email, password);
	
 	knex.select('email', 'hash')
 	.from('login')
 	.where('email', '=', email)
 	.then(user => {
 		if(bcrypt.compareSync(password, user[0].hash)){
 			knex.select('*')
 			.from('users')
 			.where('email', '=', user[0].email)
 			.then(user => res.json(user[0]))
 		}else{
 			res.status(400).json('failed')
 		}
 	})
 	.catch(err => res.json('failed'))

})

app.post('/register', (req, res) => {
	console.log('API', 'registeration attempted')
	const {name, email, password} = req.body;
	if(!name || !email || !password){
		return req.status(400).json('invalid form submission');
	}
	const hash = bcrypt.hashSync(password);

	//Using a transaction
	knex.transaction(trx => {
		trx('login').insert({
			email: email,
			hash: hash
		}).returning('email')
		.then(userEmail => {
			return trx('users').insert({
				name: name,
			 	email: userEmail[0],
			 	count: 0,
			 	joined: new Date()
			}).returning('*')
			.then(user => res.json(user[0]))
		})
	 .then(trx.commit)
	 .catch(err => {
	 	trx.rollback;
	 	console.log(err);
	 	res.status(400).json('User Could not be registered')
	 })
	})
	
})

app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	knex.select('*').from('users').where({id:id})
	.then(user => {
		if(user.length){
		res.json(user[0]);
		}else{
			res.status(400).json('User Not Found')			
		}
	})
})


app.put('/image', (req, res) => {
	const {id} = req.body;

	let userFound = false;
	console.log("id is ", id);

	knex('users')
	.returning('count')
	.increment({count: 1})
	.where({id:id})
	.then(count => {
		if(count.length){
			res.json(count[0])
		}else{
			res.json('User not Found')	
		}
	})
	.catch(err => res.json('Some Error Occured in image counter'));
})


app.listen(process.env.PORT || 3000, () => {
	console.log(`Server running on port ${process.env.PORT}`);
});
const express = require('express');
const bodyParser = require('body-parser');
const Cloudant = require('@cloudant/cloudant');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Import the cors package

const app = express();
const port = 3000;
// const port = process.env.PORT || 3000; // Use environment variable PORT or default to 3002


app.use(cors()); 
app.use(bodyParser.json());

// Cloudant credentials from IBM Cloud
const cloudantUsername = 'apikey-v2-2o9rt3ebjz6htpvrpfu2nvcpyhdojo6zt7z7bpqe62ny';
const cloudantPassword = '3f93a3866cb7de43fc2de4e44045ed0b';
const cloudantUrl = 'https://apikey-v2-2o9rt3ebjz6htpvrpfu2nvcpyhdojo6zt7z7bpqe62ny:3f93a3866cb7de43fc2de4e44045ed0b@ab0b7dbc-af60-4512-a539-d65ed2b81993-bluemix.cloudantnosqldb.appdomain.cloud';

// Initialize Cloudant
const cloudant = Cloudant({
  account: cloudantUsername,
  password: cloudantPassword,
  url: cloudantUrl
});

// Create a new database or use an existing one
const db1 = cloudant.db.use('todo_user_auth');
const db = cloudant.db.use('todos_data');

app.get('/', (req, res) => {
  res.send('backend working');
});

// API endpoint to handle user registration
app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, username, password } = req.body;

    // Check if the username already exists
    const existingUser = await db1.find({ selector: { username } });
    if (existingUser.docs.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user data into Cloudant
    const newUser = { firstName, lastName, username, password: hashedPassword };
    const response = await db1.insert(newUser);
    res.status(201).json({ message: 'User registered successfully', data: response });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // API endpoint to handle user login

// app.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Fetch user data from Cloudant based on the username
//     const userData = await db.find({ selector: { username } });
//     if (userData.docs.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Verify the password using bcrypt
//     const isPasswordValid = await bcrypt.compare(password, userData.docs[0].password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Return success response with user data (excluding password)
//     const { _id, firstName, lastName } = userData.docs[0];
//     res.status(200).json({ _id, firstName, lastName,username });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      const userData = await db1.find({ selector: { username } });
      if (userData.docs.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const isPasswordValid = await bcrypt.compare(password, userData.docs[0].password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ username: userData.docs[0].username }, 'your_secret_key', { expiresIn: '1h' });
  
      const { _id, firstName, lastName } = userData.docs[0];
      res.status(200).json({ _id, firstName, lastName, username, token });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
// importing JWT Package for creating Tokens when User Logged In
const jwt = require('jsonwebtoken');

// configuring dotenv file
require('dotenv').config();

// fetching the secret key from .env file
const secretKey = process.env.JWT_SECRET;

// this function authenticate that the token is valid token or not
const authenticateToken = async (req, res, next)=>{
    // fetching the token from the header
    let token = req.header('Authorization');

    // if token not found, then we send the failed response to the user
    if(!token) {
        return res.status(401).send({
            message:'Authentication Failed! Token Not Found!'
        });
    }

    // if token found then we verify the token, that its a valid token or not
    // or the time limit of the token is not expired

    // 3rd parameter is a callback function, where "err" is the error object and "user" is the normal object
    // "err" -> If there is an error during the verification process, this parameter will contain an error object. If verification is successful, "err" will be "null"
    // If there's an issue, the err object will provide information about the error, such as the reason for verification failure.

    // "user" -> If verification is successful, this parameter will contain the decoded payload of the JWT
    // The decoded payload is a JavaScript object representing the information stored in the original JWT's payload section
    // It typically includes claims like "issuer" (iss), "subject" (sub), "audience" (aud), "expiration time" (exp), and others.
    jwt.verify(token, secretKey, (err, user) => {
        // if there is an error in token
        // then we send the failed response to the user, that token is not valid
        if(err) {
            return res.status(403).send({
                message:"Token Not Valid! Please Login Again!"
            });
        }

        // if token is valid then we add the token in the user object
        // if any of the controller wants to access the value of the user, it can access with the help of "req.user"
        req.user = user;

        // and jump to the next middleware
        // after completing the above tasks, it will jump to the next task specified in the route of the ToDoRoutes
        next();
    });
}



function getUserToken(req) {
  return req.headers.authorization; // Assuming the token is passed in the Authorization header
}

// API endpoint to create a todo
app.post('/api/todo/create-to-do', async (req, res) => {
  try {
    const token = getUserToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { title, description, isCompleted, completedOn, createdBy } = req.body;
    const todo = { title, description, isCompleted, completedOn, createdBy };
    const response = await db.insert(todo);

    const taskData = { ...response, ...todo };

    // res.status(201).json({ message: 'Todo created successfully', data: response });
    res.status(201).json({ message: 'Todo created successfully', data: taskData });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // API endpoint to create a todo
// app.post('/api/todo/create-to-do', async (req, res) => {
//   try {
//     const { title, description, isCompleted, completedOn, createdBy } = req.body;
//     const todo = { title, description, isCompleted, completedOn, createdBy };
//     const response = await db.insert(todo);
//     res.status(201).json({ message: 'Todo created successfully', data: response });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// API endpoint to get all todos
// app.get('/api/todo/all-to-do', async (req, res) => {
//   try {
//     const todos = await db.list({ include_docs: true });
//     res.status(200).json({ todos: todos.rows.map(row => row.doc) });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
app.get('/api/todo/all-to-do/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // Fetch todos based on the username
    const todos = await db.find({
      selector: {
        createdBy: { $eq: username }
      }
    });
    if (!todos.docs || todos.docs.length === 0) {
      return res.status(404).json({ error: 'Todos not found for this user' });
    }
    res.status(200).json({ todos: todos.docs });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// API endpoint to update a todo

app.patch('/api/todo/update-to-do/:_id', async (req, res) => {
  try {
    const _id = req.params._id;
    const { title, description, isCompleted } = req.body;

    // Fetch the existing todo item from the database
    const existingTodo = await db.get(_id);

    // Update the fields that are provided in the request body
    const updatedTodo = {
      ...existingTodo,
      title: title || existingTodo.title,
      description: description || existingTodo.description,
      isCompleted: isCompleted || existingTodo.isCompleted,
    };

    // Update the todo item in the database
    const response = await db.insert(updatedTodo);

    res.status(200).json({ message: 'Todo updated successfully', data: response });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/todo/update-completed/:_id', async (req, res) => {
  try {
    const _id = req.params._id;
    const { isCompleted } = req.body; // Only need isCompleted from the request body

    // Fetch the existing todo item from the database
    const existingTodo = await db.get(_id);

    // Update the isCompleted field based on the request body
    existingTodo.isCompleted = isCompleted;

    // Update the todo item in the database
    const response = await db.insert(existingTodo); // Assuming db.insert updates existing records

    res.status(200).json({ message: 'Todo updated successfully', data: response });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});




// // API endpoint to delete a todo
// app.delete('/api/todo/delete-to-do/:_id', async (req, res) => {
//   try {
//     const token = getUserToken(req);
//     if (!token) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//     const _id = req.params._id;
//     const { _rev } = req.body._rev;
//     const response = await db.destroy(_id, _rev);
//     res.status(200).json({ message: 'Todo deleted successfully', data: response });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

//////////////// delete a document
app.delete('/api/todo/delete-to-do/:_id', function (req, res) {
  const _id = req.params._id;
  const { _rev } = req.body;
  if (!_id || !_rev) {
    res.status(400).send('Bad Request: Missing ID or Revision');
    return;
  }

  db.destroy(_id, _rev, (err, data) => {
    if (err) {
      console.error(err); // Log the error for debugging purposes
      res.status(500).send('Error deleting user: ' + err.message); // Send detailed error message
    } else {
      res.send(data);
    }
  });
});




// exporting the function which authenticate the token
module.exports = authenticateToken;

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});



const express = require('express');
const bodyParser = require('body-parser');
const Cloudant = require('@cloudant/cloudant');
const cors = require('cors'); // Add CORS middleware if needed

const app = express();
const port = 3002;

app.use(bodyParser.json());
app.use(cors()); // Enable CORS if required

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
const db = cloudant.db.use('todos_data');

// // Function to extract the user token from localStorage
// function getUserToken() {
//     const user = getUserDetails();
//     return user?.finalData?.token;
//   }
  
//   // Function to generate authorization headers
//   function authHeaders() {
//     const token = getUserToken();
//     return { headers: { 'Authorization': token } };
//   }

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
    if (!_id || ! _rev) {
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




app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});

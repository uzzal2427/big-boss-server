const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000 ;

// middleware

app.use(cors());
app.use(express.json());

// api

app.get('/', (req,res)=>{
    res.send('this is the server of my restaurant Big Boss')
});


app.listen(port, ()=>{
    console.log(`this server is running on port ${port}`);
})
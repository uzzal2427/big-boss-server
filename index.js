const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

// api

app.get("/", (req, res) => {
  res.send("this is the server of my restaurant Big Boss");
});

// DB connection

const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gnu7f4d.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify jwt 

const verifyJwt = (req,res,next)=>{
  const authorization = req.headers.authorization ;
  if(!authorization){
    return res.status(401).send({error : true , message : 'unauthorize token'})
  }

  const authorizationToken = authorization.split(' ')[1] ;

  jwt.verify(authorizationToken, process.env.JWT_TOKEN, (err, decoded)=>{
    if(err){
      return res.status(402).send({error : true , message : 'unauthorize token or expire token'})
    }
    
    req.decoded = decoded ;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("bigBossDb").collection("users");
    const menuCollection = client.db("bigBossDb").collection("menu");
    const reviewCollection = client.db("bigBossDb").collection("reviews");
    const cartCollection = client.db("bigBossDb").collection("carts");
    const paymentCollection = client.db("bigBossDb").collection("payments");

    app.get('/menu', async(req,res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result)
    })
    app.post('/menu', async (req,res)=>{
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result)
    })
    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result)
    })

    // user api

    app.post('/users', async(req,res)=>{
      const userInfo = req.body ;
      const query = {email : userInfo.email} ;
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return 
      }
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    })

    app.get('/users', async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req,res)=>{
      const id = req.params.id ;
      const filter = {_id : new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter , updateDoc);
      res.send(result)
    })

    app.delete('/users/:id', async(req,res)=>{
      const id = req.params.id ;
      const query = {_id : new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })

    // admin user api

    app.get('/users/admin/:email',verifyJwt, async(req,res)=>{
      const email = req.params.email ;
      if(req.decoded.email !== email){
        return res.status(403).send({admin : false})
      }
      const query = {email : email} ;
      const user = await usersCollection.findOne(query);
      const result = {admin : user?.role == 'admin'};
      res.send(result)
    })

    // jwt token api

    app.post('/jwt', (req,res)=>{
      const user = req.body ;
      const token = jwt.sign(user , process.env.JWT_TOKEN , { expiresIn: '1h' })
      res.send({token});
    })

    // cart collection

    app.get('/carts', verifyJwt, async (req,res)=>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email ;
      if(decodedEmail !== email ){
        return res.status(403).send({error : true , message : ' you dont have access here'})
      }
      if(!email){
        return [] ;
      }
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req,res)=>{
      const items = req.body ;
      const result = await cartCollection.insertOne(items) ;
      res.send(result)
    })

    app.delete('/carts/:id', async(req,res)=>{
      const id = req.params.id ;
      const query = {_id : new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

    // payment api

    app.post('/create-payment-intent', verifyJwt, async (req,res)=>{
      const {price} = req.body ;
      const amount = price*100 ;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount ,
        currency: "usd",
        payment_method_types : ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    app.post('/payments', verifyJwt, async(req,res)=>{
      const payment = req.body ;
      const result = await paymentCollection.insertOne(payment);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`this server is running on port ${port}`);
});

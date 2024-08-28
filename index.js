// Import required modules
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const cookieParser = require("cookie-parser");

const mongodbURL = "mongodb://localhost:27017/mern3";
const port = process.env.port || 8080;

// Create a new Express.js app
const app = express();
app.use(cookieParser());
app.get("/", (req, res) => {
  // Set a cookie
  res.cookie("my_cookie", "cookie_value", { maxAge: 900000, httpOnly: true });
  // Retrieve a cookie
  console.log(req.cookies.my_cookie);
  res.send("Cookie set");
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

app.use(cors());
app.use("/images", express.static("images"));
app.use("/images", express.static(path.join(__dirname, "images")));
// Configure body-parser middleware to handle JSON data
app.use(bodyParser.json());

const imagesDir = path.join(__dirname, "images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}
// Connect to the MongoDB database
mongoose
  .connect(mongodbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database is connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

// login and signup section
// Signup route
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    user = new User({
      name,
      email,
      password,
    });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ msg: "User registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    res.json({ msg: "Login successful" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Create a MongoDB schema for rooms
const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    pricePerHour: { type: Number, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

// Create a MongoDB model for rooms
const Room = mongoose.model("Room", roomSchema);

// Create a MongoDB schema for bookings
const bookingSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    price: { type: Number, required: true },
    paymentType: { type: String, required: false },
    tip: { type: Number, required: false },
  },
  { timestamps: true }
);

// Create a MongoDB model for bookings
const Booking = mongoose.model("Booking", bookingSchema);

//Default route
app.get("/", (req, res) => {
  res.send("The backend server is working!");
});

// Define routes for rooms and bookings
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/rooms/:roomNumber", async (req, res) => {
  try {
    const room = await Room.findOne({ roomNumber: req.params.roomNumber });
    if (room) {
      res.json(room);
    } else {
      res.status(404).json({ message: "Room not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/bookings/:id", async (req, res) => {
  try {
    const book = await Booking.findOne({ _id: req.params.id });
    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// app.post("/rooms", async (req, res) => {
//   const room = new Room({
//     roomNumber: req.body.roomNumber,
//     roomType: req.body.roomType,
//     pricePerHour: req.body.pricePerHour,
//   });

//   try {
//     const newRoom = await room.save();
//     res.status(201).json(newRoom);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

//contact section start..........
const Contact = require("./models/Contact");

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;

  const newContact = new Contact({
    name,
    email,
    message,
  });

  newContact
    .save()
    .then((contact) => res.status(201).json(contact))
    .catch((err) => res.status(400).json(err));
});
//contact section end............

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("roomNumber");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// post booking adds.....................
// const Booking = mongoose.model('Booking', bookingSchema);

app.post("/bookings", (req, res) => {
  const newBooking = new Booking(req.body);

  newBooking
    .save()
    .then((booking) => res.status(201).json(booking))
    .catch((err) => res.status(400).json({ message: err.message }));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/rooms", upload.single("image"), async (req, res) => {
  try {
    const { roomNumber, roomType, pricePerHour } = req.body;
    const imageUrl = req.file
      ? `http://localhost:8080/images/${req.file.filename}`
      : undefined;
    const room = new Room({ roomNumber, roomType, pricePerHour, imageUrl });
    await room.save();
    res.status(201).send(room);
  } catch (error) {
    res.status(400).send(error);
  }
});

// UploadRoom section end.............................

app.put("/bookings/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
  } else {
    const room = await Room.findOne({ roomNumber: req.body.roomNumber });
    const existingBooking = await Booking.find({
      roomNumber: req.body.roomNumber,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
    });
    console.log(existingBooking);
    if (existingBooking.length > 1) {
      res.status(400).json({ message: "Room is already booked" });
    } else if (!room) {
      res.status(400).json({ message: "Room does not exist" });
    } else {
      try {
        const newBooking = await booking.updateOne({ $set: req.body });
        res.status(201).json(newBooking);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
  }
});

app.delete("/bookings/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
  } else {
    try {
      await booking.deleteOne();
      res.json({ message: "Booking deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log("Server started on port " + port);
});

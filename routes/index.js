const express = require("express");
const router = express.Router();
const adminModel = require("../models/admin");
const jwt = require('jsonwebtoken');
// const requireAuth = require("../middleware/requireAuth");
const deleteUploadImage = require("../helpers/deleteImage");
const upload = require("./files");
const studentModel = require("../models/student");
const headersModel = require("../models/headers");
const { Result } = require("../models/result");
const { default: mongoose } = require("mongoose");
const scratchCardModel = require("../models/scratchCard");
const { ExamInstances } = require("../models/examInstances");
// const createToken = require("../auth/jwt");

// const maxAge = 3*24*60*60
// const createToken = (id)=>{
//   // 1st parameter is the payload, 2nd is the secret
// return jwt.sign({id},process.env.SECRET,{
// expiresIn: maxAge
// });
// }

router.get("/", (req, res) => {
  // res.json({message:'successful'})
  res.status(200).render("admin");
});


// create an admin route
router.post("/",upload.single("file"), async (req, res) => {
  try {
    // console.log(req.body);
    const findAdmin = await adminModel.findOne({ email: req.body.email });
    if (!findAdmin) { 
      let form = new adminModel({  
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        image: req.file.filename
      });
      form.save().then(data => {

        // let token = createToken(data._id)
        // res.cookie('AriTron', token,{httpOnly:true, maxAge: '1d'})
        res.status(200).json({ message: `${data.name} is now an admin` });

      });
    } else {
      deleteUploadImage(req.file.filename);
      res.status(400).json({ message: `${req.body.email} already exist` });
    }
  } catch (error) {
    // console.log(error);
  //  let err = handleError(error)
   res.status(400).json({message: error})
  }
});


// verify admin logins
router.post("/verify", async (req, res, next) => {
  try {
    const {email,password} = req.body
    // return console.log(req.body)
    const admin = await adminModel.login(email,password)
    // let token = createToken(admin._id)
    const token = jwt.sign({ id: admin._id }, process.env.SECRET, { expiresIn: '3d' });
    const image = `${req.protocol}://${req.get('host')}/uploads/${admin.image}`;

    res.cookie('adminCookie', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use true in production
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      sameSite: 'Strict', // Adjust based on your setup
      path: '/'
    });

    // console.log('Cookie sent:', res.get('Set-Cookie'));
      // console.log('cookie :', req.cookies)
    res.status(200).json({name: admin.name,email , image});
  
  } catch (error) {
    console.log(error);
  
    if (error.message === 'incorrect Email') {
      return res.status(404).json({ message: 'Email is not registered' });
    } else if (error.message === 'incorrect Password') {
      return res.status(400).json({ message: 'Password is incorrect' });
    } else {
      return res.status(500).json({ message: 'Something went wrong' });
    }
  }
});




const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle
  while (currentIndex !== 0) {
    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap it with the current element
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};


router.post('/verify-login', async (req, res) => {
  try {
    const { profileCode } = req.body;

    if (!profileCode) {
      return res.status(400).json({ error: 'You did not enter a profile code' });
    }
    
    const [candidate, examInstnc] = await Promise.all([
      studentModel.findOne({ profileCode }).populate({
        path: 'subject',
        populate: {
          path: 'questions'
        }
      }),
      ExamInstances.findOne({ profileCode })
    ]);

    if (!candidate) {
      return res.status(400).json({ error: 'You are not authorized for an exam' });
    }

    const token = jwt.sign({ id: candidate._id }, process.env.SECRET, { expiresIn: '3d' });

    const copiedSubjects = candidate.subject.map(subject => {
      const shuffledQuestions = shuffleArray(subject.questions).slice(0, 50);
      const questionsWithImages = shuffledQuestions.map(question => ({
        _id: question._id,
        subjectName: subject.name,
        subjectId: subject._id,
        question: question.question,
        option_A: question.option_A,
        option_B: question.option_B,
        option_C: question.option_C,
        answer: question.answer,
        selectedOption: "",
        image: question.image ? `${req.protocol}://${req.get('host')}/uploads/${question.image}` : null
      }));

      return {
        _id: subject._id,
        name: subject.name,
        questions: questionsWithImages
      };
    });

    const image = candidate.image ? `${req.protocol}://${req.get('host')}/uploads/${candidate.image}` : '';

    res.cookie('studentExamCookie', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use true in production
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      sameSite: 'Strict', // Adjust based on your setup
      path: '/'
    });

    if (examInstnc) {
      return res.status(200).json({ message: examInstnc, image: examInstnc.image });
    }

    const newExamInstance = new ExamInstances({
      studentId: candidate._id,
      profileCode: candidate.profileCode,
      classId: candidate.classId,
      className: candidate.className,
      timer: candidate.timer,
      candidateName: candidate.candidateName,
      subject: copiedSubjects,
      phone: candidate.phone,
      endExam: candidate.endExam,
      image: image
    });

    const savedInstance = await newExamInstance.save();
    return res.status(200).json({ message: savedInstance, image: savedInstance.image });

  } catch (error) {
    console.error("Error verifying login:", error);
    if (!res.headersSent) {
     return res.status(500).send("Server error.");
    }
  }
});

router.post('/student-state/:profileCode', async (req, res) => {
  try {
    const { profileCode } = req.params; // Use query parameters
    // console.log(req.params.profileCode)
    // Find student by profileCode
    const examInstnc = await ExamInstances.findOne({ profileCode });
    // If an instance already exists, return it immediately
    if (examInstnc) {
      return res.status(200).json({ message: examInstnc, image: examInstnc.image });
    } else {
      return res.status(404).json({ error: "No exam instance found." });
    }
  } catch (error) {
    console.error("Error fetching student state:", error);
    res.status(500).send("Server error."); 
  }
});


router.get('/headings',async function(req, res) {
  try {
    const headings = await headersModel.find().lean()
    // console.log(headings)
    res.status(200).json({data: headings});
  } catch (error) {
    console.log(error.message)
  }
})



router.get('/student-results/:id',async (req,res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ data: 'Invalid ID' });
    }
    const results = await Result.findById({_id: id});
    if (!results) {
      return res.status(404).json({ data: 'No results found' });
    }
    res.status(200).json({ data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ data: 'Server error' });
  }
})



router.post('/st-check-result', async (req, res) => {
  try {
    const { profileCode, scratchCard } = req.body;

    // Fetch result and scratch card data in parallel
    const [sCard, result] = await Promise.all([
      scratchCardModel.findOne({ card: scratchCard }),
      Result.findOne({ profileCode }),
    ]);
    

    // Ensure result exists for the provided profile code
    if (!result) {
      return res.status(404).json({ error: 'Result not found for this profile code' });
    }

    // Check if the result already has a scratch card associated
    if (result.scratchCard) {
      // If the scratch card is different, check its validity
      if (result.scratchCard !== scratchCard) {
        if (!sCard) {
          return res.status(400).json({ error: 'This scratch card has been used' });
        }
        // Assign the new valid scratch card
        result.count = 1;
        result.scratchCard = scratchCard;
        await Promise.all([ result.save(),scratchCardModel.findByIdAndDelete( { _id: sCard._id })])
        return res.status(200).json({ markedResult: result._id });
      }

      // Enforce maximum usage of scratch card (3 times)
      if (result.count >= 3) {
        return res.status(400).json({ error: 'Scratch card limit of 3 times triers has been reached' });
      }

      // Increment the usage count
      result.count += 1;
      await result.save();

      // Return the result
      return res.status(200).json({ markedResult: result._id });
    }

    // For first-time scratch card usage
    if (!sCard) {
      return res.status(400).json({ error: 'Invalid scratch card' });
    }

    
    // Assign scratch card and initialize count
    result.count = 1;
    result.scratchCard = scratchCard;
    await Promise.all([ result.save(),scratchCardModel.findByIdAndDelete( { _id: sCard._id })])
    // await result.save();
    // Remove the scratch card from the database after use
  //  const gg = await scratchCardModel.findByIdAndDelete( { _id: sCard._id });

    // Respond with the result ID
    res.status(200).json({ markedResult: result._id });
  } catch (error) {
    console.error('Error checking result:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
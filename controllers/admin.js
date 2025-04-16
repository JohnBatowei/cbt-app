const asyncHandler = require("express-async-handler");
const classModel = require("../models/class");
const mongoose = require("mongoose");
const subjectModel = require("../models/subject");
const deleteUploadImage = require("../helpers/deleteImage");
const questionModel = require("../models/question");
const studentModel = require("../models/student");
const { Result } = require("../models/result");
const headersModel = require("../models/headers");
const scratchCardModel = require("../models/scratchCard");



//--------------------create--a--class-------------------------------------------------------
module.exports.createClass = asyncHandler(async (req, res) => {
  const { name, timer, subjects, profileCodeInitials } = req.body;

  // return console.log(subjects)
  // Validate required fields
  if (!name || !timer || !Array.isArray(subjects) || !profileCodeInitials) {
    return res.status(400).json({ message: "Invalid input data." });
  }
  try {
    const name2 = name.toLowerCase();
    const profileCodeInitialsUppercase = profileCodeInitials.toUpperCase()
    const findClasss = await classModel.findOne({ name: name2 });

    if (findClasss) {
      return res.status(400).json({ message: `${name2} already exist` });
    }

    // Fetch subject IDs
    const subjectQueries = subjects.map((subjectId) =>
      subjectModel.findOne({ _id: subjectId }).lean()
    );
    const questionIds = await Promise.all(subjectQueries);

    // return console.log(subjects,questionsIds)
    const newClass = new classModel({
      name: name2,
      timer,
      subject: questionIds, // Assuming `subjects` are valid ObjectId references
      profileCodeInitials: profileCodeInitialsUppercase,
    });

    await newClass.save();
    res.status(200).json({ message: `${name} class created successfully !!!` });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).send("Server error.");
  }
});

module.exports.deleteClass = asyncHandler(async (req, res) => {
  const id = req.params.id;
  // console.log(id);

  if (mongoose.Types.ObjectId.isValid(req.params.id)) {

    const result = await classModel.findByIdAndDelete(req.params.id);

    if (result) {
      await studentModel.deleteMany({classId : result._id})
      res.status(200).json({ message: `${result.name} deleted alongside students of the class successfully !!!` });
    } else {
      res.status(404).json({ message: "Class not found" });
    }
  } else {
    res.status(404).json({ message: "Invalid ID" });
  }
});


module.exports.updateClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, timer, subjects, profileCodeInitials } = req.body;

  // console.log('Request Body:', req.body);
  // console.log('Class ID:', id);
  const profileCodeInitial = profileCodeInitials.toUpperCase()

  try {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    // Validate subjects array
    if (!Array.isArray(subjects) || !subjects.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid subject IDs' });
    }

    // Find the class by ID and update it
    const updatedClass = await classModel.findByIdAndUpdate(
      id,
      {
        name,
        timer,
        subject: subjects, // Update the subject field
        profileCodeInitials: profileCodeInitial,
      },
      { new: true, runValidators: true } // Return the updated document and apply validators
    );

    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // console.log('Updated Class:', updatedClass);

    res.status(200).json({ message: `${name} has been updated successfully!` });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//----------------------------End of Class---------------------------------------------------



// ------------------------------Subject---Section-----------------------------------------
module.exports.createSubject = asyncHandler(async (req, res) => {
  // console.log(req.body.subjectName);
  // Check if the subject already exists
  const findSubject = await subjectModel.findOne({
    name: req.body.subjectName,
  });
  if (findSubject) {
    return res.status(200).json({ message: `Oops ${req.body.subjectName} already exists` });
  }

  // Create a new subject
  const create = await subjectModel.create({ name: req.body.subjectName });
  if (!create) {
    return res.json({ message: "Error creating subject" });
  }

  // Respond with success message
  res.json({ message: `${req.body.subjectName} has been created` });
});

module.exports.getSubjects = asyncHandler(async (req, res) => {
  // Fetch classes and populate the subject field and nested questions field
  // const classes = await classModel
  //   .find()
  //   .sort({ createdAt: -1 })
  //   .populate({
  //     path: "subject",
  //     populate: {
  //       path: "questions",
  //     },
  //   })
  //   .exec();

  // console.log(classes);
  // const findSubject = await subjectModel.find().sort({ createdAt: -1 }).lean();
  // const findCandidates = await studentModel.find().sort({ createdAt: -1 }).lean();

  const [classes,findSubject,findCandidates] = await Promise.all([
    classModel.find().sort({ createdAt: -1 }).populate({path: "subject", populate: {  path: "questions", },}).exec(),
    subjectModel.find().sort({ createdAt: -1 }).lean(),
    studentModel.find().sort({ createdAt: -1 }).lean()
  ])
  // console.log(findSubject);
  // Respond with success message
  res.status(200).json({ message: findSubject, classes, findCandidates });
});

module.exports.deleteSubject = asyncHandler(async (req, res) => {
  const subjectId = req.params.del;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return res.status(400).json({ message: "Invalid subject ID" });
  }

  // Find and delete all questions associated with the subject
  const questions = await questionModel.find({ subjectId: subjectId }).lean();
  for (const question of questions) {
    if (question.image) {
      // Delete the image associated with the question
      deleteUploadImage(question.image);
    }
  }

  // Delete all questions
  await questionModel.deleteMany({ subjectId: subjectId });

  // Find and delete the subject
  const deletedSubject = await subjectModel
    .findOneAndDelete({ _id: subjectId })
    .lean();

  if (!deletedSubject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  // Respond with success message
  res.json({ message: deletedSubject.name + " deleted successfully." });
});

//----------------------------------End of Subject------------------------------------------



//------------------------Questions---Section--------------------------------------------------
module.exports.uploadQuestion = asyncHandler(async (req, res) => {
  let { subjectId, question, optionA, optionB, optionC, answer } = req.body;
  // console.log(req.body)
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return res.status(400).json({ message: "Not a valid id" });
  }

  // Find the subject
  const findSubject = await subjectModel.findOne({ _id: subjectId });
  if (!findSubject) {
    if (req.file && req.file.filename) {
      deleteUploadImage(req.file.filename);
    }
    return res.status(404).json({ message: "Unable to find subject" });
  }

  // Prepare question object
  const questionData = {
    subjectName: findSubject.name,
    subjectId,
    question, // Consistent field name
    option_A: optionA,
    option_B: optionB,
    option_C: optionC,
    answer: answer.trim().toLowerCase(),
  };

  // Add file information if provided
  if (req.file && req.file.filename) {
    questionData.image = req.file.filename;
  }

  // Create and save the question
  const quest = new questionModel(questionData);

  try {
    const saveQuestion = await quest.save();

    //save question id to subject aswell
    findSubject.questions.push(saveQuestion._id);
    await findSubject.save();
    res
      .status(200)
      .json({
        message: "Your question has been added to " + saveQuestion.subjectName,
      });
  } catch (error) {
    if (req.file && req.file.filename) {
      deleteUploadImage(req.file.filename);
    }
    res.status(500).json({ message: "Server error" });
  }
});

module.exports.getSubjectQuestions = asyncHandler(async (req, res) => {
  const subjectId = req.params.subjectId;
  // console.log("got it");
  // Check if the subject already exists

  const findSubjectQuestions = await questionModel.find({ subjectId });

  const subjectPlusWithImages = findSubjectQuestions.map((question) => ({
    subjectName: question.subjectName,
    questionId: question._id,
    subjectId: subjectId,
    question: question.question,
    optionA: question.option_A,
    optionB: question.option_B,
    optionC: question.option_C,
    answer: question.answer,
    image: `${req.protocol}://${req.get("host")}/uploads/${question.image}`,
  }));

  const questions = [];
  let subjectName = "";
  // console.log(questions);
  for (let i = subjectPlusWithImages.length - 1; i >= 0; i--) {
    questions.push(subjectPlusWithImages[i]);
    subjectName = subjectPlusWithImages[i].subjectName;
  }

  // console.log(findSubject);
  // Respond with success message
  res.status(200).json({ questions, subjectName });
});

// module.exports.getAllQuestions = asyncHandler(async (req, res) => {
//   const findSubjectQuestions = await questionModel.find().lean();

//   const subjectPlusWithImages = findSubjectQuestions.map((question) => ({
//     subjectName: question.subjectName,
//     questionId: question._id,
//     subjectId: question.subjectId,
//     question: question.question,
//     optionA: question.option_A,
//     optionB: question.option_B,
//     optionC: question.option_C,
//     answer: question.answer,
//     image: `${req.protocol}://${req.get("host")}/uploads/${question.image}`,
//   }));

//   const questions = [];

//   // console.log(questions);
//   for (let i = subjectPlusWithImages.length - 1; i >= 0; i--) {
//     questions.push(subjectPlusWithImages[i]);
//     subjectName = subjectPlusWithImages[i].subjectName;
//   }

//   // console.log(questions);
//   // Respond with success message
//   res.status(200).json({ questions });
// });

module.exports.getAllQuestions = asyncHandler(async (req, res) => {
  const questionsFromDB = await questionModel.find().lean();

  const formattedQuestions = questionsFromDB.map((question) => ({
    subjectName: question.subjectName,
    questionId: question._id,
    subjectId: question.subjectId,
    question: question.question,
    optionA: question.option_A,
    optionB: question.option_B,
    optionC: question.option_C,
    answer: question.answer,
    image: question.image ? `${req.protocol}://${req.get("host")}/uploads/${question.image}` : null,
  }));

  res.status(200).json({ questions: formattedQuestions });
});


module.exports.deleteQuestion = asyncHandler(async (req, res) => {
  // const subjectId = req.params.subjectId
  const questionId = req.params.questionId;
  // console.log('got it')
  // console.log(req.params)
  const question = await questionModel.findByIdAndDelete({ _id: questionId });
  if (!question) {
    return res.status(500).json({ message: `Unable to delete question` });
  }
  deleteUploadImage(question.image);

  res.status(200).json({ message: `Question delete successfully` });
});

module.exports.patchQuestion = asyncHandler(async (req, res) => {
  const { subjectId, questionId, question, optionA, optionB, optionC, answer } =
    req.body;

  // console.log(req.body)
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return res.status(400).json({ message: "Not a valid id" });
  }

  const questionD = await questionModel.findById({ _id: questionId });
  if (!questionD) {
    return res.status(500).json({ message: "Unable to find document" });
  }

  questionD.question = question;
  questionD.option_A = optionA;
  questionD.option_B = optionB;
  questionD.option_C = optionC;
  questionD.answer = answer;

  if (req.file && req.file.filename) {
    deleteUploadImage(questionD.image);
    questionD.image = req.file.filename;
  }

  const saveQuestion = await questionD.save();
  if (!saveQuestion) {
    return res.status(500).json({ message: `Unable to update question` });
  }

  res.status(200).json({ message: `Question updated successfully!!!` });
});
//-----------------------End of Question Section---------------------------------------------------


//----------------Candidates---or---Student---------------------------------------------------------------

module.exports.registerStudent = asyncHandler(async (req, res) => {
  try {
    // console.log('got it')
    // console.log(req.body)
    // let a = req.body.subjects
    // console.log(JSON.parse(a))
    // console.log(req.file.filename)
    // deleteUploadImage(req.file.filename)
    // return
    const { classId, className,fullname,phoneNumber,profileCode, examTime,subjects } = req.body;

    // Check if all required fields are present
    if (!classId || !className || !fullname || !profileCode || !examTime) {
      if (req.file) {
        deleteUploadImage(req.file.filename)
      }
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const ProfileCodeExist = await studentModel.findOne({profileCode : profileCode})
    if(ProfileCodeExist){
      if (req.file) {
        deleteUploadImage(req.file.filename)
      }
      return res.status(400).json({ message: `Ooops sorry profile code already in use` });
    }

    // Handle file upload
    let image = '';
    if (req.file) {
      image = req.file.filename; // Store the file path in the database
    }
    // Create a new student
    const newStudent = new studentModel({
      classId,
      className,
      timer: examTime,
      candidateName: fullname.toLowerCase(),
      image: image,
      profileCode,
      phone: phoneNumber,
      subject: JSON.parse(subjects), // Parse subjects to array of ObjectIds
    });

    // Save the student to the database
   const saveCan = await newStudent.save();

    res.status(200).json({ message: `${saveCan.candidateName} has been registered successfully !!!` });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports.deleteStudent = asyncHandler(async (req, res) => {
  const id = req.params.id;

  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Invalid ID" });
  }

  try {
    // Find and delete the student by ID
    const result = await studentModel.findByIdAndDelete(id);

    // Check if student was found and deleted
    if (!result) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete associated image if any
    if (result.image) {
      deleteUploadImage(result.image);
    }

    // console.log(result)
    // Respond with success message
    res.status(200).json({ message: `${result.candidateName} deleted successfully!!!` });

  } catch (error) {
    // Handle any errors that occurred during the process
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "An error occurred while deleting the student" });
  }
});


// ---------------------Send  results -----------------------------------------------------------------

module.exports.sendResult = asyncHandler(async (req, res) => {
  try {
      // Fetch all results
      const results = await Result.find({})
      // const results = await Result.find({}).populate('studentId').populate('classId').populate('subjects.subjectId');

      // Organize results by className
      const resultsByClass = {};

      results.forEach(result => {
          const className = result.className;
          if (!resultsByClass[className]) {
              resultsByClass[className] = [];
          }
          resultsByClass[className].push(result);
      });

      // Send organized results to the browser
      res.status(200).json({
          success: true,
          data: resultsByClass
      });

  } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to retrieve results'
      });
  }
});



// ---------------------End Send  results -------------------------------------------------------
module.exports.sendClassResult = asyncHandler(async (req, res) => {
  try {
      // Fetch all results
      const results = await Result.find({classId: req.params.class})

      res.status(200).json({
     data: results
      });

  } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to retrieve results'
      });
  }
});



module.exports.sendClassRegisteredCans = asyncHandler(async (req, res) => {
  try {

    if(!mongoose.Types.ObjectId.isValid(req.params.classId)){
      return res.status(404).json({ data: 'Invalid ID' });
    }
      // Fetch all results
      const results = await studentModel.find({classId: req.params.classId}).populate('subject')

      res.status(200).json({
     data: results
      });

  } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to retrieve results'
      });
  }
});


// --------------------Headers ------------------------------------------------------------------


module.exports.changeHeaders = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
        console.log(body)
    if (!body || !id) {
      return res.status(400).json({ data: "Client errors" });
    }

    const headerUpdate = {};
    if (id === "f") {
      headerUpdate.frontPage = body;
    } else if (id === "coo") {
      headerUpdate.corPage = body;
    } else if (id === "can") {
      headerUpdate.canPage = body;
    } else if(id === "confirmation"){
      headerUpdate.confirmation = body.toLowerCase();
    }else if (id === "result") {
      headerUpdate.resultPage = body;
    } else {
      return res.status(400).json({ data: "Invalid header type" });
    }

    const header = await headersModel.findOneAndUpdate(
      { deff: id },
      headerUpdate,
      { upsert: true, new: true } // upsert creates a new document if none exists
    );

    return res.status(200).json({ data: `${id.toUpperCase()} page heading updated successfully!!!` });
  } catch (error) {
    console.error("Error updating header:", error);
    res.status(500).json({ data: "Server error" });
  }
});



module.exports.allHeaders = asyncHandler(async (req, res) => {
  try {
    const allHeaders = await headersModel.find({}).lean();
    res.status(200).json({ data: allHeaders });
  } catch (error) {
    console.error("Error fetching headers:", error);
    res.status(500).json({ data: "Server error" });
  }
});




// Function to generate a unique scratch card
const date = new Date();
const year = date.getFullYear();
function handleCard(length, cardNumber) {
  const generatedCards = new Set();

  // Helper function to generate a single scratch card
  function generateScratchCard(length) {
    const chars = 'ABC0123456789EFGH';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result;
  }

  // Keep generating unique scratch cards until we reach the desired count
  while (generatedCards.size < cardNumber) {
    generatedCards.add(year+generateScratchCard(length));
  }

  // Convert Set to array and return it
  return Array.from(generatedCards);
}

module.exports.scratchCard = asyncHandler(async (req, res) => {
  try {
    const { cardCount } = req.body;

    if(!cardCount){
      return res.status(400).json({ error : "Count cannot be empty" });
    }
    if(isNaN(cardCount)){
      return res.status(400).json({ error : "Your count input must be a number" });
    }
    // Generate the required number of scratch cards
    const genCards = handleCard(10, cardCount);

    // Save all generated cards to the database in bulk
    const cardData = genCards.map(card => ({ card })); // Create array of objects for each card

    await scratchCardModel.insertMany(cardData);

    res.status(200).json({ data: `${cardCount} scratch cards generated successfully` });
  } catch (error) {
    console.error("Error generating scratch cards:", error);
    res.status(500).json({ data: "Server error" });
  }
});


module.exports.getScratchCard = asyncHandler(async (req, res) => {
  try {
    const data = await scratchCardModel.find({}).sort({createdAt: -1}).lean()

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error generating scratch cards:", error);
    res.status(500).json({ data: "Server error" });
  }
});

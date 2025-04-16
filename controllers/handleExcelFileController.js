const multer = require('multer'); // Importing multer for handling file uploads
const ExcelJS = require('exceljs'); // Importing ExcelJS for working with Excel files
const questionModel = require('../models/question'); // Importing the Question model
const subjectModel = require('../models/subject'); // Importing the Subject model
const classModel = require('../models/class'); // Importing the Class model
const studentModel = require('../models/student'); // Importing the Student model
const asyncHandler = require('express-async-handler'); // Importing asyncHandler for handling async operations

// Multer setup for handling file uploads
const storage = multer.memoryStorage(); // Configuring multer to store files in memory
const upload = multer({ storage: storage }).single('file'); // Setting up multer to handle single file uploads


//---------------------------------------------------------------------

// Generate a random profile code
function generateProfileCode(length) {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

const year = new Date().getFullYear();

module.exports.handleExcelFileCandidates = [
  upload,
  asyncHandler(async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const candidatesNotAdded = [];
    const studentsToInsert = [];

    const classCache = {};
    const subjectCache = {};

    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const className = row.getCell(1).value?.toString().toLowerCase().trim() || '';
      const candidateName = row.getCell(2).value?.toString().trim() || '';
      const phoneNo = row.getCell(3).value?.toString().trim() || '';
      const subjectsRaw = [
        row.getCell(4).value?.toString().toLowerCase().trim() || '',
        row.getCell(5).value?.toString().toLowerCase().trim() || '',
        row.getCell(6).value?.toString().toLowerCase().trim() || '',
        row.getCell(7).value?.toString().toLowerCase().trim() || '',
      ];

      if (!className || !candidateName) {
        console.warn(`Skipping row ${rowIndex}: Missing class or candidate name.`);
        continue;
      }

      // Get or cache class data
      let classData = classCache[className];
      if (!classData) {
        classData = await classModel.findOne({ name: className });
        classCache[className] = classData;
      }

      if (!classData) {
        candidatesNotAdded.push(candidateName);
        continue;
      }

      const subjectIds = [];
      for (const subjectName of subjectsRaw) {
        if (subjectName) {
          let subject = subjectCache[subjectName];
          if (!subject) {
            subject = await subjectModel.findOne({ name: subjectName });
            subjectCache[subjectName] = subject;
          }
          if (subject) {
            subjectIds.push(subject._id);
          } else {
            console.warn(`Subject not found: ${subjectName}`);
          }
        }
      }

      const student = {
        classId: classData._id,
        className: classData.name,
        timer: classData.timer,
        candidateName: candidateName,
        image: '',
        profileCode: `BAT${year}${generateProfileCode(4)}`,
        subject: subjectIds,
        phone: phoneNo,
      };

      studentsToInsert.push(student);
    }

    if (studentsToInsert.length > 0) {
      await studentModel.insertMany(studentsToInsert);
    }

    if (candidatesNotAdded.length > 0) {
      return res.status(400).json({
        message: `Class not found. The following candidates were not added: ${candidatesNotAdded.join(', ')}`
      });
    }

    return res.status(200).json({ message: 'Candidates uploaded successfully' });
  })
];


module.exports.handleExcelFileQuestion = [
  upload, // Multer middleware to handle file upload

  asyncHandler(async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0]; // Load the first worksheet

    const questionsToInsert = [];
    const subjectMap = new Map(); // Cache to hold existing or newly created subjects

    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const subjectName = row.getCell(1).value
        ? row.getCell(1).value.toString().toLowerCase()
        : null;
      const questionText = row.getCell(2).value || "";
      const optionA = row.getCell(3).value || "";
      const optionB = row.getCell(4).value || "";
      const optionC = row.getCell(5).value || "";
      const answer = row.getCell(6).value
        ? row.getCell(6).value.toString().toLowerCase()
        : "";

      if (!subjectName || !questionText || !optionA || !optionB || !optionC || !answer) {
        console.warn(`Skipping row ${rowIndex} due to missing required data.`);
        continue;
      }

      // Use cached subject or fetch/create it
      let subject = subjectMap.get(subjectName);
      if (!subject) {
        subject = await subjectModel.findOne({ name: subjectName });
        if (!subject) {
          subject = await subjectModel.create({ name: subjectName, questions: [] });
        }
        subjectMap.set(subjectName, subject);
      }

      const question = new questionModel({
        subjectName,
        subjectId: subject._id,
        question: questionText,
        option_A: optionA,
        option_B: optionB,
        option_C: optionC,
        answer,
      });

      questionsToInsert.push(question);
      subject.questions.push(question._id); // Update in-memory only
    }

    // Bulk insert questions
    if (questionsToInsert.length > 0) {
      await questionModel.insertMany(questionsToInsert);

      // Save updated subject question lists
      const saveSubjectPromises = [];
      for (const subject of subjectMap.values()) {
        saveSubjectPromises.push(subject.save());
      }
      await Promise.all(saveSubjectPromises);

      res.status(200).json({ message: `${questionsToInsert.length} questions uploaded successfully.` });
    } else {
      res.status(400).json({ message: "No valid questions to upload." });
    }
  }),
];
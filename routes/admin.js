const express = require("express");
const router = express.Router();
const {
  deleteStudent,
  createClass,
  updateClass,
  deleteClass,
  createSubject,
  getSubjects,
  deleteSubject,
  uploadQuestion,
  getSubjectQuestions,
  getAllQuestions,
  deleteQuestion,
  patchQuestion,
  registerStudent,
  sendResult,
  sendClassResult,
  changeHeaders,
  allHeaders,
  sendClassRegisteredCans,scratchCard,getScratchCard
} = require("../controllers/admin");

const requireAuth = require("../middleware/requireAuth");
const upload = require("./files");
const { handleExcelFileQuestion, handleExcelFileCandidates } = require("../controllers/handleExcelFileController");

router.use(requireAuth);

//--------------Create-----Class---------------------------------------
router.post("/create-class", createClass);
router.delete("/delete-class/:id", deleteClass);
router.patch("/update-class/:id", updateClass);

// ---------------------Subject--------------------------------------------
router.post("/create-subject", createSubject);
router.get("/get-subjects", getSubjects);
router.delete("/delete-subject/:del", deleteSubject);

//-----------------Question------------------------------------------------
router.post("/create-subject-question", upload.single("file"), uploadQuestion);
router.get("/get-subject-questions/:subjectId", getSubjectQuestions);
router.get("/get-all-questions", getAllQuestions);
router.delete("/delete-question/:subjectId/:questionId", deleteQuestion);
router.patch("/update-question", upload.single("file"), patchQuestion);

//------------------------Candidate---or------Student-------------------------
router.post("/register-student", upload.single("file"), registerStudent);
router.delete("/delete-student/:id", deleteStudent);



//-----------upload-----excel---file--- for----cand
router.post('/upload-x-question', handleExcelFileQuestion);
router.post('/upload-x-candidate', handleExcelFileCandidates);


// -----------get all result----------------------
router.get('/get-results',sendResult)
router.get('/class-results/:class',sendClassResult)
router.get('/class-registered-students/:classId',sendClassRegisteredCans)

//-------------------change-----headers------------------------
router.post('/change-headers/:id',changeHeaders);
router.get('/all-headers', allHeaders);

router.post('/create-scratch-card', scratchCard);
router.get('/get-scratch-card', getScratchCard);

module.exports = router;

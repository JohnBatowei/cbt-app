const asyncHandler = require("express-async-handler");
const studentModel = require("../models/student");
const { Result } = require("../models/result");
const { ExamInstances } = require("../models/examInstances");

// Fetch student details including subjects and questions
module.exports.getStudentDetails = asyncHandler(async (req, res) => {
  try {
    const studentId = req.student; // The authenticated student's ID

    if (!studentId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No student ID provided" });
    }

    // Find the student by ID and populate their subjects and related questions
    const student = await studentModel.findById(studentId).populate({
      path: "subject",
      populate: {
        path: "questions",
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Respond with the found student details
    res.status(200).json({ data: student });
  } catch (error) {
    console.error("Error fetching student details:", error);
   return res.status(500).json({ error: "Server error" });
  }
});
// module.exports.getStudentDetails = asyncHandler(async (req, res) => {
//   try {
//     const studentId = req.student;

//     if (!studentId) {
//       return res.status(401).json({ error: "Unauthorized: No student ID provided" });
//     }

//     // Exclude questions, only return subject names or basic info
//     const student = await studentModel.findById(studentId)
//       .select("candidateName className profileCode subject") // pick what you need
//       .populate({
//         path: "subject",
//         select: "name", // exclude questions by not selecting them
//       })
//       .lean();

//     if (!student) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     res.status(200).json({ data: student });
//   } catch (error) {
//     console.error("Error fetching student details:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });


// module.exports.updateExamInstance = asyncHandler(async (req, res) => {
//   try {
//     const studentId = req.student.toString();
//     const { classId, className, candidateName, profileCode, subjects,timer } = req.body;
// console.log(candidateName, timer)
//     // Find the existing exam instance for the student by profileCode
//     let examInstance = await ExamInstances.findOne({ profileCode });

//     if (!examInstance) {
//       return res.status(404).json({ message: 'Exam instance not found' });
//     }

//         // Update the timer directly on the exam instance
//         const t = timer > examInstance.timer ? examInstance.timer: timer
//         examInstance.timer = t;

//     subjects.forEach(subjectToUpdate => {
//       const instanceSubject = examInstance.subject.find(sub => sub._id === subjectToUpdate.subjectId);
      
//       if (instanceSubject) {
//         subjectToUpdate.questions.forEach(questionToUpdate => {
//           const instanceQuestion = instanceSubject.questions.find(q => q._id === questionToUpdate.questionId);
          
//           if (instanceQuestion) {
//             instanceQuestion.selectedOption = questionToUpdate.selectedOption || instanceQuestion.selectedOption;
//           }
//         });
//       }
//     });
    
//     // Save the updated exam instance
//     await examInstance.save();

//     res.status(200).json({ message: 'Exam instance updated successfully' });
//   } catch (error) {
//     console.error(error);
//    return res.status(500).json({ message: 'Server error' });
//   }
// });

module.exports.updateExamInstance = asyncHandler(async (req, res) => {
  try {
    const studentId = req.student.toString();
    const { classId, className, candidateName, profileCode, subjects, timer } = req.body;

    console.log(`Updating exam for: ${candidateName}, Timer sent: ${timer}`);

    // Find the existing exam instance for the student by profileCode
    let examInstance = await ExamInstances.findOne({ profileCode });

    if (!examInstance) {
      return res.status(404).json({ message: 'Exam instance not found' });
    }

    // Ensure timer is only updated if it's less than the saved timer
    examInstance.timer = Math.min(timer, examInstance.timer);

    // Create a Map for faster subject lookup
    const subjectMap = new Map(
      examInstance.subject.map(sub => [sub._id.toString(), sub])
    );

    // Loop through subjects and update respective selectedOptions
    subjects.forEach(subjectToUpdate => {
      const instanceSubject = subjectMap.get(subjectToUpdate.subjectId);

      if (instanceSubject) {
        // Map questions for fast access
        const questionMap = new Map(
          instanceSubject.questions.map(q => [q._id.toString(), q])
        );

        subjectToUpdate.questions.forEach(questionToUpdate => {
          const instanceQuestion = questionMap.get(questionToUpdate.questionId);

          if (instanceQuestion) {
            instanceQuestion.selectedOption =
              questionToUpdate.selectedOption || instanceQuestion.selectedOption;
          }
        });
      }
    });

    // Save the updated exam instance
    await examInstance.save();

    res.status(200).json({ message: 'Exam instance updated successfully' });
  } catch (error) {
    console.error("Error updating exam instance:", error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports.markQuestion = asyncHandler(async (req, res) => {
  try {
    const studentId = req.student; // The authenticated student's ID
    const { classId, className, candidateName, profileCode, subjects } = req.body;

    let totalScore = 0;
    const markedSubjects = subjects.map((subject) => {
      const totalQuestions = subject.questions.length;

      // If there are no questions in the subject, set score to 0
      if (totalQuestions === 0) {
        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          score: 0,
        };
      }

      let correctAnswers = 0;
      subject.questions.forEach((question) => {
        if (question.selectedOption === question.correctAnswer) {
          correctAnswers += 1;
        }
      });

      // Calculate the score for the subject, ensuring it's a valid number
      const subjectScore = (correctAnswers / totalQuestions) * 100 || 0;
      totalScore += subjectScore;

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        score: subjectScore,
      };
    });

    // Save the result in batch (use bulk operations)
    const result = new Result({
      studentId,
      classId,
      className,
      candidateName,
      profileCode,
      totalScore: totalScore || 0, // Ensure totalScore is a valid number
      subjects: markedSubjects,
    });

    // Use bulkWrite or create in bulk if handling multiple results
    const markedResult = await result.save();

    // Handling multiple deletions in parallel using Promise.all
    const [studentDeleteResult, examInstanceDeleteResult] = await Promise.all([
      studentModel.findByIdAndDelete({ _id: markedResult.studentId }), // Delete student record
      ExamInstances.findOneAndDelete({ profileCode }), // Delete exam instance
    ]);

    // You can return the results, but note it's improved with the optimized approach
    res.status(200).json({
      message: "Results marked successfully",
      totalScore,
      subjects: markedSubjects,
      markedResult: markedResult._id,
    });
  } catch (error) {
    console.error("Error marking questions:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

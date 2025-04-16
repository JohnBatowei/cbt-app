import http from 'k6/http';
import { check, sleep } from 'k6';

// Set the number of virtual users (students) and test duration
export const options = {
  vus: 50,  // Number of concurrent users (you can increase to 100, 200, etc.)
  duration: '30s',  // Duration of the test
};

// Define the base URL of your server
const BASE_URL = 'http://localhost:3800';  // Replace with your actual server URL

export default function () {
  // Step 1: Create a student profile (this generates a profile code)
  const profileRes = http.post(`${BASE_URL}/create-profile`, JSON.stringify({
    name: `Student${Math.random()}`,  // Randomized student name for uniqueness
    email: `student${Math.random()}@example.com`,  // Randomized email for uniqueness
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Ensure the profile is created successfully
  check(profileRes, { 'profile created': (r) => r.status === 200 });

  // Extract the profile code from the response
  const profileCode = profileRes.json('profileCode');  // Adjust based on your API's response structure
  if (!profileCode) return;  // Stop if profile creation fails

  // Step 2: Log in using the generated profile code
  const loginRes = http.post(`${BASE_URL}/login`, JSON.stringify({
    profileCode: profileCode,  // Log in using the generated profile code
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Ensure the login is successful
  check(loginRes, { 'logged in successfully': (r) => r.status === 200 });

  // Extract the JWT token (if your app uses JWT authentication)
  const token = loginRes.json('token');
  if (!token) return;  // Stop if login fails

  // Step 3: Submit the exam (once logged in)
  const submitExamRes = http.post(`${BASE_URL}/submit-exam`, JSON.stringify({
    examId: 'exam123',  // Replace with the actual exam ID
    answers: { question1: 'A', question2: 'B', question3: 'C' },  // Mock answers for testing
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,  // Use JWT token if needed
    },
  });

  // Ensure the exam submission is successful
  check(submitExamRes, { 'exam submitted successfully': (r) => r.status === 200 });

  sleep(1);  // Simulate a short pause between actions
}

import requests
import sys
import json
from datetime import datetime
import uuid

class SchoolConnectAPITester:
    def __init__(self, base_url="https://63284647-149a-4b9d-85cf-e0555440ed39.preview.emergentagent.com"):
        self.base_url = base_url
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result = response.json()
                    print(f"Response: {json.dumps(result, indent=2)}")
                    return success, result
                except:
                    print(f"Response: {response.text}")
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_schools(self):
        """Test getting Texas schools data"""
        success, response = self.run_test(
            "Get Texas Schools",
            "GET",
            "schools",
            200
        )
        self.test_results["get_schools"] = success
        return success

    def test_register_user(self):
        """Test user registration"""
        test_user = {
            "name": f"Test User {uuid.uuid4().hex[:8]}",
            "email": f"test{uuid.uuid4().hex[:8]}@example.com",
            "school_id": "plano_east",
            "school_type": "high_school",
            "grade_level": "11",
            "classes": [
                {
                    "subject": "AP Calculus",
                    "teacher": "Mrs. Smith",
                    "period": "1st",
                    "days": ["Monday", "Wednesday", "Friday"],
                    "room": "101"
                },
                {
                    "subject": "Physics",
                    "teacher": "Mr. Johnson",
                    "period": "2nd",
                    "days": ["Tuesday", "Thursday"],
                    "room": "203"
                }
            ]
        }
        
        success, response = self.run_test(
            "Register User",
            "POST",
            "register",
            200,
            data=test_user
        )
        
        if success and "user_id" in response:
            self.user_id = response["user_id"]
            print(f"Created user with ID: {self.user_id}")
        
        self.test_results["register_user"] = success
        return success

    def test_get_classmates(self):
        """Test getting classmates"""
        if not self.user_id:
            print("❌ Cannot test classmates - no user ID available")
            self.test_results["get_classmates"] = False
            return False
            
        success, _ = self.run_test(
            "Get Classmates",
            "GET",
            f"classmates/{self.user_id}",
            200
        )
        self.test_results["get_classmates"] = success
        return success

    def test_create_assignment(self):
        """Test creating an assignment"""
        if not self.user_id:
            print("❌ Cannot test assignment creation - no user ID available")
            self.test_results["create_assignment"] = False
            return False
            
        assignment_data = {
            "user_id": self.user_id,
            "title": "Test Assignment",
            "subject": "AP Calculus",
            "due_date": (datetime.now().isoformat()),
            "description": "This is a test assignment",
            "priority": "high"
        }
        
        success, response = self.run_test(
            "Create Assignment",
            "POST",
            "assignments",
            200,
            data=assignment_data
        )
        self.test_results["create_assignment"] = success
        return success

    def test_get_assignments(self):
        """Test getting assignments"""
        if not self.user_id:
            print("❌ Cannot test getting assignments - no user ID available")
            self.test_results["get_assignments"] = False
            return False
            
        success, _ = self.run_test(
            "Get Assignments",
            "GET",
            f"assignments/{self.user_id}",
            200
        )
        self.test_results["get_assignments"] = success
        return success

    def test_create_help_request(self):
        """Test creating a help request"""
        if not self.user_id:
            print("❌ Cannot test help request creation - no user ID available")
            self.test_results["create_help_request"] = False
            return False
            
        form_data = {
            "title": "Need help with calculus",
            "subject": "AP Calculus",
            "description": "I'm struggling with derivatives",
            "user_id": self.user_id
        }
        
        # Note: In a real test, you would include actual files
        success, _ = self.run_test(
            "Create Help Request",
            "POST",
            "help-requests",
            200,
            data=form_data,
            files={}
        )
        self.test_results["create_help_request"] = success
        return success

    def test_get_help_requests(self):
        """Test getting help requests"""
        success, _ = self.run_test(
            "Get Help Requests",
            "GET",
            "help-requests",
            200
        )
        self.test_results["get_help_requests"] = success
        return success

    def test_ai_assistant(self):
        """Test AI assistant"""
        ai_data = {
            "prompt": "What is the quadratic formula?",
            "subject": "Mathematics"
        }
        
        success, _ = self.run_test(
            "AI Assistant",
            "POST",
            "ai-assistant",
            200,
            data=ai_data
        )
        self.test_results["ai_assistant"] = success
        return success

    def test_gpa_calculator(self):
        """Test GPA calculator"""
        gpa_data = {
            "grades": [
                {"letter": "A", "credit_hours": 3},
                {"letter": "B", "credit_hours": 4},
                {"letter": "A", "credit_hours": 3}
            ]
        }
        
        success, _ = self.run_test(
            "GPA Calculator",
            "POST",
            "gpa-calculator",
            200,
            data=gpa_data
        )
        self.test_results["gpa_calculator"] = success
        return success

    def test_mla_formatter(self):
        """Test MLA formatter"""
        mla_data = {
            "type": "website",
            "author": "Smith, John",
            "title": "How to Write MLA Citations",
            "website": "Citation Guide",
            "url": "https://example.com/mla",
            "date": "2023-05-15"
        }
        
        success, _ = self.run_test(
            "MLA Formatter",
            "POST",
            "mla-format",
            200,
            data=mla_data
        )
        self.test_results["mla_formatter"] = success
        return success

    def test_academic_resources(self):
        """Test getting academic resources"""
        success, _ = self.run_test(
            "Academic Resources",
            "GET",
            "academic-resources",
            200
        )
        self.test_results["academic_resources"] = success
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SchoolConnect API Tests")
        
        # Test getting schools data
        self.test_get_schools()
        
        # Test user registration
        self.test_register_user()
        
        # Test classmates
        self.test_get_classmates()
        
        # Test assignments
        self.test_create_assignment()
        self.test_get_assignments()
        
        # Test help requests
        self.test_create_help_request()
        self.test_get_help_requests()
        
        # Test academic tools
        self.test_ai_assistant()
        self.test_gpa_calculator()
        self.test_mla_formatter()
        self.test_academic_resources()
        
        # Print summary
        print("\n📊 Test Summary:")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        # Print detailed results
        print("\nDetailed Results:")
        for test, result in self.test_results.items():
            status = "✅ Passed" if result else "❌ Failed"
            print(f"{test}: {status}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = SchoolConnectAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
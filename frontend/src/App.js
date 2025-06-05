import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('register');
  const [schools, setSchools] = useState({ high_schools: [], colleges: [] });
  const [classmates, setClassmates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Registration form state
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    school_id: '',
    school_type: 'high_school',
    grade_level: '',
    classes: []
  });

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    subject: '',
    due_date: '',
    description: '',
    priority: 'medium'
  });

  // Help request form state
  const [helpForm, setHelpForm] = useState({
    title: '',
    subject: '',
    description: '',
    files: []
  });

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiSubject, setAiSubject] = useState('');

  // GPA Calculator state
  const [gpaGrades, setGpaGrades] = useState([]);
  const [calculatedGpa, setCalculatedGpa] = useState(null);

  // MLA Citation state
  const [citationForm, setCitationForm] = useState({
    type: 'website',
    author: '',
    title: '',
    website: '',
    url: '',
    date: '',
    publisher: '',
    year: ''
  });
  const [generatedCitation, setGeneratedCitation] = useState('');

  // Academic Resources state
  const [academicResources, setAcademicResources] = useState({});

  useEffect(() => {
    fetchSchools();
    fetchAcademicResources();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchClassmates();
      fetchAssignments();
      fetchHelpRequests();
    }
  }, [currentUser]);

  const fetchSchools = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/schools`);
      const data = await response.json();
      setSchools(data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchClassmates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/classmates/${currentUser.id}`);
      const data = await response.json();
      setClassmates(data);
    } catch (error) {
      console.error('Error fetching classmates:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/assignments/${currentUser.id}`);
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchHelpRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/help-requests?school_id=${currentUser.school_id}`);
      const data = await response.json();
      setHelpRequests(data);
    } catch (error) {
      console.error('Error fetching help requests:', error);
    }
  };

  const fetchAcademicResources = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/academic-resources`);
      const data = await response.json();
      setAcademicResources(data);
    } catch (error) {
      console.error('Error fetching academic resources:', error);
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationForm)
      });
      
      const data = await response.json();
      if (response.ok) {
        const user = { ...registrationForm, id: data.user_id };
        setCurrentUser(user);
        setActiveTab('dashboard');
        alert('Registration successful!');
      } else {
        alert('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const addClass = () => {
    setRegistrationForm({
      ...registrationForm,
      classes: [...registrationForm.classes, {
        subject: '',
        teacher: '',
        period: '',
        days: [],
        room: ''
      }]
    });
  };

  const updateClass = (index, field, value) => {
    const updatedClasses = [...registrationForm.classes];
    updatedClasses[index][field] = value;
    setRegistrationForm({ ...registrationForm, classes: updatedClasses });
  };

  const removeClass = (index) => {
    const updatedClasses = registrationForm.classes.filter((_, i) => i !== index);
    setRegistrationForm({ ...registrationForm, classes: updatedClasses });
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assignmentForm, user_id: currentUser.id })
      });
      
      if (response.ok) {
        setAssignmentForm({ title: '', subject: '', due_date: '', description: '', priority: 'medium' });
        fetchAssignments();
        alert('Assignment created successfully!');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const createHelpRequest = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', helpForm.title);
    formData.append('subject', helpForm.subject);
    formData.append('description', helpForm.description);
    formData.append('user_id', currentUser.id);
    
    for (let file of helpForm.files) {
      formData.append('files', file);
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/help-requests`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setHelpForm({ title: '', subject: '', description: '', files: [] });
        fetchHelpRequests();
        alert('Help request posted successfully!');
      }
    } catch (error) {
      console.error('Error creating help request:', error);
    }
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, subject: aiSubject })
      });
      
      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateGPA = async () => {
    if (gpaGrades.length === 0) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/gpa-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gpaGrades })
      });
      
      const data = await response.json();
      setCalculatedGpa(data.gpa);
    } catch (error) {
      console.error('Error calculating GPA:', error);
    }
  };

  const generateCitation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/mla-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(citationForm)
      });
      
      const data = await response.json();
      setGeneratedCitation(data.citation);
    } catch (error) {
      console.error('Error generating citation:', error);
    }
  };

  const addGrade = () => {
    setGpaGrades([...gpaGrades, { letter: 'A', credit_hours: 3 }]);
  };

  const updateGrade = (index, field, value) => {
    const updated = [...gpaGrades];
    updated[index][field] = field === 'credit_hours' ? parseInt(value) : value;
    setGpaGrades(updated);
  };

  const removeGrade = (index) => {
    setGpaGrades(gpaGrades.filter((_, i) => i !== index));
  };

  // Get current school name
  const getCurrentSchoolName = () => {
    if (!currentUser) return '';
    const schoolList = currentUser.school_type === 'high_school' ? schools.high_schools : schools.colleges;
    const school = schoolList.find(s => s.id === currentUser.school_id);
    return school ? school.name : currentUser.school_id;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎓 SchoolConnect</h1>
            <p className="text-gray-600 text-lg">Your Academic Hub for Texas Students</p>
          </div>

          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-center">Join Your School Community</h2>
            
            <form onSubmit={handleRegistration}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={registrationForm.name}
                  onChange={(e) => setRegistrationForm({...registrationForm, name: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({...registrationForm, email: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  value={registrationForm.school_type}
                  onChange={(e) => setRegistrationForm({...registrationForm, school_type: e.target.value, school_id: ''})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high_school">High School</option>
                  <option value="college">College</option>
                </select>

                <select
                  value={registrationForm.school_id}
                  onChange={(e) => setRegistrationForm({...registrationForm, school_id: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select School</option>
                  {(registrationForm.school_type === 'high_school' ? schools.high_schools : schools.colleges).map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder={registrationForm.school_type === 'high_school' ? "Grade (9-12)" : "Year (Freshman, etc.)"}
                  value={registrationForm.grade_level}
                  onChange={(e) => setRegistrationForm({...registrationForm, grade_level: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Your Classes</h3>
                  <button
                    type="button"
                    onClick={addClass}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Add Class
                  </button>
                </div>

                {registrationForm.classes.map((cls, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-2 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Subject (e.g., AP Math)"
                        value={cls.subject}
                        onChange={(e) => updateClass(index, 'subject', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Teacher Name"
                        value={cls.teacher}
                        onChange={(e) => updateClass(index, 'teacher', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Period/Time"
                        value={cls.period}
                        onChange={(e) => updateClass(index, 'period', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Room Number"
                        value={cls.room}
                        onChange={(e) => updateClass(index, 'room', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 flex-wrap">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                          <label key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={cls.days.includes(day)}
                              onChange={(e) => {
                                const days = e.target.checked 
                                  ? [...cls.days, day]
                                  : cls.days.filter(d => d !== day);
                                updateClass(index, 'days', days);
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm">{day.slice(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClass(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Join SchoolConnect'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">🎓 SchoolConnect</h1>
              <span className="text-gray-600">|</span>
              <span className="text-gray-700">{getCurrentSchoolName()}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {currentUser.name}!</span>
              <button
                onClick={() => setCurrentUser(null)}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
              { id: 'classmates', label: '👥 Classmates', icon: '👥' },
              { id: 'homework-hub', label: '📚 Homework Hub', icon: '📚' },
              { id: 'ai-assistant', label: '🤖 AI Assistant', icon: '🤖' },
              { id: 'planner', label: '📅 Planner', icon: '📅' },
              { id: 'gpa-calculator', label: '📊 GPA Calculator', icon: '📊' },
              { id: 'mla-formatter', label: '📝 MLA Formatter', icon: '📝' },
              { id: 'resources', label: '🔗 Academic Resources', icon: '🔗' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-700 hover:text-indigo-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">📚 Your Classes</h3>
              <div className="space-y-2">
                {currentUser.classes.map((cls, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-3">
                    <div className="font-medium">{cls.subject}</div>
                    <div className="text-sm text-gray-600">{cls.teacher} • {cls.period}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">👥 Classmates Found</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">{classmates.length}</div>
              <p className="text-gray-600">Students in your classes</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">📋 Upcoming Assignments</h3>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {assignments.filter(a => !a.completed).length}
              </div>
              <p className="text-gray-600">Tasks to complete</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-4">📅 Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('homework-hub')}
                  className="bg-blue-100 hover:bg-blue-200 p-4 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <div className="font-medium">Get Help</div>
                </button>
                <button
                  onClick={() => setActiveTab('ai-assistant')}
                  className="bg-green-100 hover:bg-green-200 p-4 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="font-medium">Ask AI</div>
                </button>
                <button
                  onClick={() => setActiveTab('planner')}
                  className="bg-purple-100 hover:bg-purple-200 p-4 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-medium">Plan Work</div>
                </button>
                <button
                  onClick={() => setActiveTab('gpa-calculator')}
                  className="bg-orange-100 hover:bg-orange-200 p-4 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">Check GPA</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classmates' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">👥 Your Classmates</h2>
            {classmates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">👥</div>
                <p>No classmates found yet. More students will appear as they join!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classmates.map(classmate => (
                  <div key={classmate.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="font-semibold text-lg">{classmate.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{classmate.grade_level}</div>
                    <div className="text-sm">
                      <strong>Shared Classes:</strong>
                      <div className="mt-1">
                        {classmate.shared_classes.map(subject => (
                          <span key={subject} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'homework-hub' && (
          <div className="space-y-6">
            {/* Post Help Request */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">📚 Ask for Help</h2>
              <form onSubmit={createHelpRequest}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Title (e.g., Need help with calculus homework)"
                    value={helpForm.title}
                    onChange={(e) => setHelpForm({...helpForm, title: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Subject"
                    value={helpForm.subject}
                    onChange={(e) => setHelpForm({...helpForm, subject: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <textarea
                  placeholder="Describe what you need help with..."
                  value={helpForm.description}
                  onChange={(e) => setHelpForm({...helpForm, description: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mb-4"
                  rows="4"
                  required
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Upload Images (homework, worksheets, etc.)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setHelpForm({...helpForm, files: Array.from(e.target.files)})}
                    className="border rounded-lg px-4 py-2 w-full"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Post Help Request
                </button>
              </form>
            </div>

            {/* Help Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">🔍 Recent Help Requests</h2>
              {helpRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📚</div>
                  <p>No help requests yet. Be the first to ask for help!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {helpRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <span className="text-sm text-gray-500">{request.subject}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{request.description}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>By {request.user_name}</span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      {request.image_urls.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Attachments:</p>
                          <div className="flex gap-2">
                            {request.image_urls.map((url, index) => (
                              <img
                                key={index}
                                src={`${BACKEND_URL}${url}`}
                                alt="Homework attachment"
                                className="w-20 h-20 object-cover rounded border"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai-assistant' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">🤖 AI Academic Assistant</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Subject (optional)</label>
              <input
                type="text"
                placeholder="e.g., Math, Science, English"
                value={aiSubject}
                onChange={(e) => setAiSubject(e.target.value)}
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Ask me anything about your studies!</label>
              <textarea
                placeholder="e.g., Can you help me understand quadratic equations? How do I write a thesis statement?"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                rows="4"
              />
            </div>

            <button
              onClick={askAI}
              disabled={loading || !aiPrompt.trim()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Thinking...' : 'Ask AI Assistant'}
            </button>

            {aiResponse && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">AI Response:</h4>
                <p className="text-gray-700">{aiResponse}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Add Assignment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">📅 Assignment Planner</h2>
              <form onSubmit={createAssignment}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Assignment Title"
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Subject"
                    value={assignmentForm.subject}
                    onChange={(e) => setAssignmentForm({...assignmentForm, subject: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="datetime-local"
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({...assignmentForm, due_date: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={assignmentForm.priority}
                    onChange={(e) => setAssignmentForm({...assignmentForm, priority: e.target.value})}
                    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <textarea
                  placeholder="Assignment description..."
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mb-4"
                  rows="3"
                />
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Assignment
                </button>
              </form>
            </div>

            {/* Assignments List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">📋 Your Assignments</h3>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📅</div>
                  <p>No assignments yet. Add one above to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className={`border rounded-lg p-4 ${assignment.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{assignment.title}</h4>
                          <p className="text-gray-600">{assignment.subject}</p>
                          <p className="text-sm text-gray-500 mt-1">{assignment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-block px-2 py-1 rounded text-xs ${
                            assignment.priority === 'high' ? 'bg-red-100 text-red-800' :
                            assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {assignment.priority} priority
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gpa-calculator' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">📊 GPA Calculator</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Your Grades</h3>
                <button
                  onClick={addGrade}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Add Grade
                </button>
              </div>

              {gpaGrades.map((grade, index) => (
                <div key={index} className="flex gap-4 items-center mb-3">
                  <select
                    value={grade.letter}
                    onChange={(e) => updateGrade(index, 'letter', e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="A">A (4.0)</option>
                    <option value="B">B (3.0)</option>
                    <option value="C">C (2.0)</option>
                    <option value="D">D (1.0)</option>
                    <option value="F">F (0.0)</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={grade.credit_hours}
                    onChange={(e) => updateGrade(index, 'credit_hours', e.target.value)}
                    className="border rounded px-3 py-2 w-20"
                    placeholder="Credits"
                  />
                  <span className="text-sm text-gray-600">credit hours</span>
                  <button
                    onClick={() => removeGrade(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {gpaGrades.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={calculateGPA}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Calculate GPA
                  </button>
                </div>
              )}

              {calculatedGpa !== null && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Your GPA:</h4>
                  <div className="text-3xl font-bold text-blue-600">{calculatedGpa}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mla-formatter' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">📝 MLA Citation Formatter</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Citation Type</label>
              <select
                value={citationForm.type}
                onChange={(e) => setCitationForm({...citationForm, type: e.target.value})}
                className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="website">Website</option>
                <option value="book">Book</option>
              </select>
            </div>

            {citationForm.type === 'website' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Author (Last, First)"
                  value={citationForm.author}
                  onChange={(e) => setCitationForm({...citationForm, author: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Article/Page Title"
                  value={citationForm.title}
                  onChange={(e) => setCitationForm({...citationForm, title: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Website Name"
                  value={citationForm.website}
                  onChange={(e) => setCitationForm({...citationForm, website: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={citationForm.url}
                  onChange={(e) => setCitationForm({...citationForm, url: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={citationForm.date}
                  onChange={(e) => setCitationForm({...citationForm, date: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {citationForm.type === 'book' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Author (Last, First)"
                  value={citationForm.author}
                  onChange={(e) => setCitationForm({...citationForm, author: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Book Title"
                  value={citationForm.title}
                  onChange={(e) => setCitationForm({...citationForm, title: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Publisher"
                  value={citationForm.publisher}
                  onChange={(e) => setCitationForm({...citationForm, publisher: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Year"
                  value={citationForm.year}
                  onChange={(e) => setCitationForm({...citationForm, year: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              onClick={generateCitation}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Generate MLA Citation
            </button>

            {generatedCitation && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold mb-2">MLA Citation:</h4>
                <p className="font-mono text-sm bg-white p-3 rounded border">{generatedCitation}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedCitation)}
                  className="mt-2 bg-blue-500 text-white px-4 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">🔗 Academic Resources</h2>
            
            {Object.entries(academicResources).map(([category, resources]) => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold mb-4 capitalize">
                  {category.replace('_', ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resource, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-lg mb-2">{resource.name}</h4>
                      <p className="text-gray-600 text-sm mb-3">{resource.description}</p>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 inline-block"
                      >
                        Visit Site →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
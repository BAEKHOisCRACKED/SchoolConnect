import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('register');
  const [schools, setSchools] = useState({ high_schools: [], colleges: [] });
  const [classmates, setClassmates] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState(null);

  // Registration form state
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    school_id: '',
    school_type: 'high_school',
    grade_level: '',
    classes: []
  });

  // Help request form state
  const [helpForm, setHelpForm] = useState({
    title: '',
    subject: '',
    description: '',
    files: []
  });

  // Chat state
  const [newMessage, setNewMessage] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    type: 'group',
    is_secret: false,
    members: []
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

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSchools();
    fetchAcademicResources();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchClassmates();
      fetchHelpRequests();
      fetchChatRooms();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeChatRoom) {
      fetchChatMessages();
      connectWebSocket();
    }
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [activeChatRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectWebSocket = () => {
    if (currentUser && activeChatRoom) {
      const wsUrl = `ws://localhost:8001/ws/chat/${activeChatRoom.id}/${currentUser.id}`;
      const newWs = new WebSocket(wsUrl);
      
      newWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setChatMessages(prev => [...prev, message]);
      };

      newWs.onclose = () => {
        console.log('WebSocket disconnected');
      };

      setWs(newWs);
    }
  };

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

  const fetchHelpRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/help-requests?school_id=${currentUser.school_id}`);
      const data = await response.json();
      setHelpRequests(data);
    } catch (error) {
      console.error('Error fetching help requests:', error);
    }
  };

  const fetchChatRooms = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms/${currentUser.id}`);
      const data = await response.json();
      setChatRooms(data);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  const fetchChatMessages = async () => {
    if (!activeChatRoom) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms/${activeChatRoom.id}/messages`);
      const data = await response.json();
      setChatMessages(data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
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
        setActiveView('dashboard');
        alert('Welcome to SchoolConnect! 🎓');
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
        alert('Help request posted! 📚');
      }
    } catch (error) {
      console.error('Error creating help request:', error);
    }
  };

  const respondToHelpRequest = async (requestId, responseText, files = []) => {
    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('message', responseText);
    
    for (let file of files) {
      formData.append('files', file);
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/help-requests/${requestId}/respond`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        fetchHelpRequests();
        alert('Response sent! 💬');
      }
    } catch (error) {
      console.error('Error responding to help request:', error);
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

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !activeChatRoom) return;
    
    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('message', newMessage);
    formData.append('message_type', 'text');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms/${activeChatRoom.id}/messages`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createChatRoom = async () => {
    try {
      const roomData = {
        ...newRoomForm,
        created_by: currentUser.id,
        school_id: currentUser.school_id,
        members: [...newRoomForm.members, currentUser.id]
      };
      
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });
      
      if (response.ok) {
        setShowCreateRoom(false);
        setNewRoomForm({ name: '', type: 'group', is_secret: false, members: [] });
        fetchChatRooms();
        alert('Chat room created! 💬');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
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

  const getCurrentSchoolName = () => {
    if (!currentUser) return '';
    const schoolList = currentUser.school_type === 'high_school' ? schools.high_schools : schools.colleges;
    const school = schoolList.find(s => s.id === currentUser.school_id);
    return school ? school.name : currentUser.school_id;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              🎓 SchoolConnect
            </h1>
            <p className="text-gray-600 text-xl">Your Ultimate Academic Social Hub</p>
            <p className="text-gray-500 mt-2">Connect • Study • Collaborate • Succeed</p>
          </div>

          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Join Your Texas School Community
            </h2>
            
            <form onSubmit={handleRegistration}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={registrationForm.name}
                  onChange={(e) => setRegistrationForm({...registrationForm, name: e.target.value})}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({...registrationForm, email: e.target.value})}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  value={registrationForm.school_type}
                  onChange={(e) => setRegistrationForm({...registrationForm, school_type: e.target.value, school_id: ''})}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="high_school">High School</option>
                  <option value="college">College</option>
                </select>

                <select
                  value={registrationForm.school_id}
                  onChange={(e) => setRegistrationForm({...registrationForm, school_id: e.target.value})}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Your Classes</h3>
                  <button
                    type="button"
                    onClick={addClass}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
                  >
                    Add Class
                  </button>
                </div>

                {registrationForm.classes.map((cls, index) => (
                  <div key={index} className="border-2 border-gray-100 rounded-xl p-4 mb-3 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Subject (e.g., AP Math)"
                        value={cls.subject}
                        onChange={(e) => updateClass(index, 'subject', e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Teacher Name"
                        value={cls.teacher}
                        onChange={(e) => updateClass(index, 'teacher', e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Period/Time"
                        value={cls.period}
                        onChange={(e) => updateClass(index, 'period', e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Room Number"
                        value={cls.room}
                        onChange={(e) => updateClass(index, 'room', e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 flex-wrap">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                          <label key={day} className="flex items-center bg-white rounded-lg px-2 py-1">
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
                            <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClass(index)}
                        className="text-red-500 hover:text-red-700 font-medium"
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
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all text-lg font-semibold shadow-lg"
              >
                {loading ? 'Joining...' : 'Join SchoolConnect 🚀'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎓 SchoolConnect
          </h1>
          <p className="text-sm text-gray-600 mt-1">{getCurrentSchoolName()}</p>
          <p className="text-xs text-gray-500">{currentUser.name}</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
              { id: 'chat', label: 'Chat Rooms', icon: '💬' },
              { id: 'classmates', label: 'Classmates', icon: '👥' },
              { id: 'homework-hub', label: 'Homework Hub', icon: '📚' },
              { id: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
              { id: 'gpa-calculator', label: 'GPA Calculator', icon: '📊' },
              { id: 'mla-formatter', label: 'MLA Formatter', icon: '📝' },
              { id: 'resources', label: 'Resources', icon: '🔗' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setCurrentUser(null)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
          >
            <span className="text-lg">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-y-auto">
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {currentUser.name}! 🎉</h2>
                <p className="text-gray-600">Ready to connect, study, and succeed?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">📚 Your Classes</h3>
                  <div className="text-3xl font-bold mb-2">{currentUser.classes.length}</div>
                  <p className="text-blue-100">Classes enrolled</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">👥 Classmates</h3>
                  <div className="text-3xl font-bold mb-2">{classmates.length}</div>
                  <p className="text-green-100">Students found</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">💬 Chat Rooms</h3>
                  <div className="text-3xl font-bold mb-2">{chatRooms.length}</div>
                  <p className="text-orange-100">Active chats</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">📋 Help Requests</h3>
                  <div className="text-3xl font-bold mb-2">{helpRequests.length}</div>
                  <p className="text-purple-100">Community posts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">📅 Your Schedule</h3>
                  <div className="space-y-3">
                    {currentUser.classes.map((cls, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="font-semibold text-gray-800">{cls.subject}</div>
                        <div className="text-sm text-gray-600">{cls.teacher} • {cls.period} • Room {cls.room}</div>
                        <div className="text-xs text-gray-500">{cls.days.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">🚀 Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveView('chat')}
                      className="bg-gradient-to-br from-blue-500 to-purple-500 text-white p-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="text-2xl mb-2">💬</div>
                      <div className="font-medium">Join Chat</div>
                    </button>
                    <button
                      onClick={() => setActiveView('homework-hub')}
                      className="bg-gradient-to-br from-green-500 to-teal-500 text-white p-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="text-2xl mb-2">📚</div>
                      <div className="font-medium">Get Help</div>
                    </button>
                    <button
                      onClick={() => setActiveView('ai-assistant')}
                      className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="text-2xl mb-2">🤖</div>
                      <div className="font-medium">Ask AI</div>
                    </button>
                    <button
                      onClick={() => setActiveView('classmates')}
                      className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="text-2xl mb-2">👥</div>
                      <div className="font-medium">Find Friends</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'chat' && (
            <div className="flex h-full">
              {/* Chat Rooms List */}
              <div className="w-80 bg-white rounded-l-xl shadow-lg border-r border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Chat Rooms</h2>
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    + New
                  </button>
                </div>

                <div className="space-y-2">
                  {chatRooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setActiveChatRoom(room)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        activeChatRoom?.id === room.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-semibold">{room.name}</div>
                      <div className={`text-sm ${activeChatRoom?.id === room.id ? 'text-blue-100' : 'text-gray-500'}`}>
                        {room.type === 'school' ? '🏫' : room.is_secret ? '🔒' : '👥'} {room.members.length} members
                      </div>
                    </button>
                  ))}
                </div>

                {showCreateRoom && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96">
                      <h3 className="text-xl font-semibold mb-4">Create Chat Room</h3>
                      <input
                        type="text"
                        placeholder="Room Name"
                        value={newRoomForm.name}
                        onChange={(e) => setNewRoomForm({...newRoomForm, name: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2 mb-3"
                      />
                      <select
                        value={newRoomForm.type}
                        onChange={(e) => setNewRoomForm({...newRoomForm, type: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2 mb-3"
                      >
                        <option value="group">Public Group</option>
                        <option value="secret">Secret Group</option>
                      </select>
                      <label className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          checked={newRoomForm.is_secret}
                          onChange={(e) => setNewRoomForm({...newRoomForm, is_secret: e.target.checked})}
                          className="mr-2"
                        />
                        Secret Room (invite only)
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={createChatRoom}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => setShowCreateRoom(false)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 bg-white rounded-r-xl shadow-lg flex flex-col">
                {activeChatRoom ? (
                  <>
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">{activeChatRoom.name}</h3>
                      <p className="text-sm text-gray-600">
                        {activeChatRoom.type === 'school' ? '🏫 School Chat' : 
                         activeChatRoom.is_secret ? '🔒 Secret Group' : '👥 Public Group'}
                      </p>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {chatMessages.map(message => (
                          <div key={message.id} className={`flex ${message.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.user_id === currentUser.id
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {message.user_id !== currentUser.id && (
                                <div className="text-xs font-semibold mb-1">{message.user_name}</div>
                              )}
                              <div>{message.message}</div>
                              {message.file_urls && message.file_urls.length > 0 && (
                                <div className="mt-2">
                                  {message.file_urls.map((url, index) => (
                                    <img key={index} src={`${BACKEND_URL}${url}`} alt="attachment" className="max-w-full rounded" />
                                  ))}
                                </div>
                              )}
                              <div className="text-xs mt-1 opacity-75">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                          placeholder="Type your message..."
                          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={sendChatMessage}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <p className="text-xl">Select a chat room to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'classmates' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                👥 Your Classmates
              </h2>
              {classmates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-xl text-gray-600 mb-2">No classmates found yet</p>
                  <p className="text-gray-500">More students will appear as they join SchoolConnect!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classmates.map(classmate => (
                    <div key={classmate.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 hover:shadow-lg transition-all border border-gray-100">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                          {classmate.name.charAt(0)}
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">{classmate.name}</h3>
                        <p className="text-gray-600">{classmate.grade_level}</p>
                        <p className="text-sm text-blue-600">{classmate.email}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">Shared Classes:</p>
                        <div className="flex flex-wrap gap-1">
                          {classmate.shared_classes.map(subject => (
                            <span key={subject} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
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

          {activeView === 'homework-hub' && (
            <div className="space-y-6">
              {/* Post Help Request */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📚 Ask for Help
                </h2>
                <form onSubmit={createHelpRequest}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Title (e.g., Need help with calculus homework)"
                      value={helpForm.title}
                      onChange={(e) => setHelpForm({...helpForm, title: e.target.value})}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      value={helpForm.subject}
                      onChange={(e) => setHelpForm({...helpForm, subject: e.target.value})}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <textarea
                    placeholder="Describe what you need help with..."
                    value={helpForm.description}
                    onChange={(e) => setHelpForm({...helpForm, description: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-4"
                    rows="4"
                    required
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      📎 Upload Images (homework, worksheets, etc.)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setHelpForm({...helpForm, files: Array.from(e.target.files)})}
                      className="border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 w-full hover:border-blue-400 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
                  >
                    Post Help Request 📚
                  </button>
                </form>
              </div>

              {/* Help Requests */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Recent Help Requests</h2>
                {helpRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-xl text-gray-600 mb-2">No help requests yet</p>
                    <p className="text-gray-500">Be the first to ask for help!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {helpRequests.map(request => (
                      <div key={request.id} className="border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-xl text-gray-800 mb-2">{request.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                {request.subject}
                              </span>
                              <span>By {request.user_name}</span>
                              <span>{request.user_email}</span>
                              <span>{new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4">{request.description}</p>
                        
                        {request.image_urls.length > 0 && (
                          <div className="mb-4">
                            <p className="font-semibold mb-2 text-gray-700">📎 Attachments:</p>
                            <div className="flex gap-3 flex-wrap">
                              {request.image_urls.map((url, index) => (
                                <img
                                  key={index}
                                  src={`${BACKEND_URL}${url}`}
                                  alt="Homework attachment"
                                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer"
                                  onClick={() => window.open(`${BACKEND_URL}${url}`, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responses */}
                        {request.responses.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-3 text-gray-700">💬 Responses:</h4>
                            <div className="space-y-3">
                              {request.responses.map((response, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-green-700">{response.user_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(response.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-700">{response.message}</p>
                                  {response.file_urls && response.file_urls.length > 0 && (
                                    <div className="mt-2 flex gap-2">
                                      {response.file_urls.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={`${BACKEND_URL}${url}`}
                                          alt="Response attachment"
                                          className="w-16 h-16 object-cover rounded border"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Response Form */}
                        <div className="border-t pt-4">
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const responseText = e.target.response.value;
                            const files = Array.from(e.target.files.files || []);
                            if (responseText.trim()) {
                              respondToHelpRequest(request.id, responseText, files);
                              e.target.reset();
                            }
                          }}>
                            <div className="flex flex-col space-y-3">
                              <textarea
                                name="response"
                                placeholder="Write your response to help this student..."
                                className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                rows="3"
                                required
                              />
                              <div className="flex justify-between items-center">
                                <input
                                  type="file"
                                  name="files"
                                  multiple
                                  accept="image/*"
                                  className="text-sm text-gray-600"
                                />
                                <button
                                  type="submit"
                                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
                                >
                                  Send Help 💚
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'ai-assistant' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🤖 AI Academic Assistant
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Subject (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Math, Science, English"
                      value={aiSubject}
                      onChange={(e) => setAiSubject(e.target.value)}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Ask me anything about your studies!</label>
                    <textarea
                      placeholder="e.g., Can you help me understand quadratic equations? How do I write a thesis statement?"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      rows="6"
                    />
                  </div>

                  <button
                    onClick={askAI}
                    disabled={loading || !aiPrompt.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-semibold"
                  >
                    {loading ? '🤔 Thinking...' : '🚀 Ask AI Assistant'}
                  </button>
                </div>

                <div>
                  {aiResponse && (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                      <h4 className="font-bold text-blue-800 mb-3 text-lg">🤖 AI Response:</h4>
                      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResponse}</div>
                    </div>
                  )}
                  
                  {!aiResponse && (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <div className="text-6xl mb-4">🤖</div>
                      <p className="text-gray-600 text-lg">Ask me anything and I'll help you learn!</p>
                      <p className="text-gray-500 mt-2">I can help with homework, explain concepts, and guide your studies.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'gpa-calculator' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 GPA Calculator
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Your Grades</h3>
                    <button
                      onClick={addGrade}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                    >
                      Add Grade
                    </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    {gpaGrades.map((grade, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                        <select
                          value={grade.letter}
                          onChange={(e) => updateGrade(index, 'letter', e.target.value)}
                          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                          className="border rounded-lg px-3 py-2 w-20 focus:ring-2 focus:ring-blue-500"
                          placeholder="Credits"
                        />
                        <span className="text-sm text-gray-600 flex-1">credit hours</span>
                        <button
                          onClick={() => removeGrade(index)}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {gpaGrades.length > 0 && (
                    <button
                      onClick={calculateGPA}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
                    >
                      Calculate GPA 📊
                    </button>
                  )}
                </div>

                <div>
                  {calculatedGpa !== null ? (
                    <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-8 text-center">
                      <h4 className="font-bold text-green-800 mb-4 text-xl">Your GPA:</h4>
                      <div className="text-6xl font-bold text-green-600 mb-4">{calculatedGpa}</div>
                      <p className="text-green-700">
                        {calculatedGpa >= 3.5 ? 'Excellent work! 🎉' : 
                         calculatedGpa >= 3.0 ? 'Good job! Keep it up! 📈' : 
                         'You can improve! Stay motivated! 💪'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-gray-600 text-lg">Add your grades to calculate your GPA</p>
                      <p className="text-gray-500 mt-2">Track your academic progress with ease!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'mla-formatter' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📝 MLA Citation Formatter
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Citation Type</label>
                    <select
                      value={citationForm.type}
                      onChange={(e) => setCitationForm({...citationForm, type: e.target.value})}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="website">Website</option>
                      <option value="book">Book</option>
                    </select>
                  </div>

                  {citationForm.type === 'website' && (
                    <div className="space-y-4 mb-6">
                      <input
                        type="text"
                        placeholder="Author (Last, First)"
                        value={citationForm.author}
                        onChange={(e) => setCitationForm({...citationForm, author: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Article/Page Title"
                        value={citationForm.title}
                        onChange={(e) => setCitationForm({...citationForm, title: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Website Name"
                        value={citationForm.website}
                        onChange={(e) => setCitationForm({...citationForm, website: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="URL"
                        value={citationForm.url}
                        onChange={(e) => setCitationForm({...citationForm, url: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="date"
                        value={citationForm.date}
                        onChange={(e) => setCitationForm({...citationForm, date: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  {citationForm.type === 'book' && (
                    <div className="space-y-4 mb-6">
                      <input
                        type="text"
                        placeholder="Author (Last, First)"
                        value={citationForm.author}
                        onChange={(e) => setCitationForm({...citationForm, author: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Book Title"
                        value={citationForm.title}
                        onChange={(e) => setCitationForm({...citationForm, title: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Publisher"
                        value={citationForm.publisher}
                        onChange={(e) => setCitationForm({...citationForm, publisher: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Year"
                        value={citationForm.year}
                        onChange={(e) => setCitationForm({...citationForm, year: e.target.value})}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  <button
                    onClick={generateCitation}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
                  >
                    Generate MLA Citation 📝
                  </button>
                </div>

                <div>
                  {generatedCitation ? (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                      <h4 className="font-bold text-blue-800 mb-4 text-lg">📝 MLA Citation:</h4>
                      <div className="font-mono text-sm bg-white p-4 rounded-lg border mb-4 leading-relaxed">
                        {generatedCitation}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCitation);
                          alert('Citation copied to clipboard! 📋');
                        }}
                        className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
                      >
                        📋 Copy to Clipboard
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-gray-600 text-lg">Fill out the form to generate your MLA citation</p>
                      <p className="text-gray-500 mt-2">Perfect formatting every time!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'resources' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🔗 Academic Resources
              </h2>
              
              {Object.entries(academicResources).map(([category, resources]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-2xl font-bold mb-4 text-gray-800 capitalize">
                    {category.replace('_', ' ')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((resource, index) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all">
                        <h4 className="font-bold text-lg text-gray-800 mb-3">{resource.name}</h4>
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{resource.description}</p>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:shadow-lg transition-all inline-block font-medium"
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
    </div>
  );
}

export default App;
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pymongo
import os
import uuid
import json
from datetime import datetime, timedelta
import shutil
from pathlib import Path
import asyncio
from openai import OpenAI
import socketio

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = pymongo.MongoClient(MONGO_URL)
db = client.school_connect

# OpenAI setup
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str, room_id: str = None):
        await websocket.accept()
        self.user_connections[user_id] = websocket
        
        if room_id:
            if room_id not in self.active_connections:
                self.active_connections[room_id] = []
            self.active_connections[room_id].append(websocket)

    def disconnect(self, user_id: str, room_id: str = None):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            del self.user_connections[user_id]
            
            if room_id and room_id in self.active_connections:
                if websocket in self.active_connections[room_id]:
                    self.active_connections[room_id].remove(websocket)

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

    async def broadcast_to_room(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# Enhanced Texas Schools Data (Saturn-inspired)
TEXAS_SCHOOLS = {
    "high_schools": [
        {"id": "plano_east", "name": "Plano East Senior High School", "district": "Plano ISD", "city": "Plano", "mascot": "Panthers"},
        {"id": "paschal", "name": "R.L. Paschal High School", "district": "Fort Worth ISD", "city": "Fort Worth", "mascot": "Panthers"},
        {"id": "westlake", "name": "Westlake High School", "district": "Eanes ISD", "city": "Austin", "mascot": "Chaparrals"},
        {"id": "highland_park", "name": "Highland Park High School", "district": "Highland Park ISD", "city": "Dallas", "mascot": "Scots"},
        {"id": "katy", "name": "Katy High School", "district": "Katy ISD", "city": "Katy", "mascot": "Tigers"},
        {"id": "allen", "name": "Allen High School", "district": "Allen ISD", "city": "Allen", "mascot": "Eagles"},
        {"id": "southlake_carroll", "name": "Southlake Carroll High School", "district": "Carroll ISD", "city": "Southlake", "mascot": "Dragons"},
        {"id": "cypress_falls", "name": "Cypress Falls High School", "district": "Cy-Fair ISD", "city": "Houston", "mascot": "Eagles"},
        {"id": "frisco", "name": "Frisco High School", "district": "Frisco ISD", "city": "Frisco", "mascot": "Fighting Raccoons"},
        {"id": "martin", "name": "James Martin High School", "district": "Arlington ISD", "city": "Arlington", "mascot": "Warriors"},
        {"id": "trinity", "name": "Trinity High School", "district": "Euless Trinity", "city": "Euless", "mascot": "Trojans"},
        {"id": "lake_travis", "name": "Lake Travis High School", "district": "Lake Travis ISD", "city": "Austin", "mascot": "Cavaliers"},
        {"id": "flower_mound", "name": "Flower Mound High School", "district": "Lewisville ISD", "city": "Flower Mound", "mascot": "Jaguars"},
        {"id": "richardson", "name": "Richardson High School", "district": "Richardson ISD", "city": "Richardson", "mascot": "Eagles"},
        {"id": "mckinney", "name": "McKinney High School", "district": "McKinney ISD", "city": "McKinney", "mascot": "Lions"},
    ],
    "colleges": [
        {"id": "ut_austin", "name": "University of Texas at Austin", "type": "Public University", "city": "Austin", "mascot": "Longhorns"},
        {"id": "texas_am", "name": "Texas A&M University", "type": "Public University", "city": "College Station", "mascot": "Aggies"},
        {"id": "rice", "name": "Rice University", "type": "Private University", "city": "Houston", "mascot": "Owls"},
        {"id": "ttu", "name": "Texas Tech University", "type": "Public University", "city": "Lubbock", "mascot": "Red Raiders"},
        {"id": "uh", "name": "University of Houston", "type": "Public University", "city": "Houston", "mascot": "Cougars"},
        {"id": "tcu", "name": "Texas Christian University", "type": "Private University", "city": "Fort Worth", "mascot": "Horned Frogs"},
        {"id": "baylor", "name": "Baylor University", "type": "Private University", "city": "Waco", "mascot": "Bears"},
        {"id": "utd", "name": "University of Texas at Dallas", "type": "Public University", "city": "Richardson", "mascot": "Comets"},
        {"id": "smu", "name": "Southern Methodist University", "type": "Private University", "city": "Dallas", "mascot": "Mustangs"},
        {"id": "texas_state", "name": "Texas State University", "type": "Public University", "city": "San Marcos", "mascot": "Bobcats"},
    ]
}

# Pydantic Models
class User(BaseModel):
    id: str
    name: str
    email: str
    school_id: str
    school_type: str
    grade_level: str
    classes: List[Dict[str, Any]]
    gpa: Optional[float] = None
    created_at: datetime

class ChatRoom(BaseModel):
    id: str
    name: str
    type: str  # "school", "group", "secret", "dm"
    school_id: Optional[str] = None
    members: List[str]
    created_by: str
    created_at: datetime
    is_secret: bool = False

class ChatMessage(BaseModel):
    id: str
    room_id: str
    user_id: str
    message: str
    message_type: str = "text"  # "text", "image", "file"
    file_urls: List[str] = []
    created_at: datetime

class HelpRequest(BaseModel):
    id: str
    user_id: str
    title: str
    subject: str
    description: str
    image_urls: List[str] = []
    responses: List[Dict[str, Any]] = []
    status: str = "open"
    created_at: datetime

# Real OpenAI Integration
async def get_ai_response(prompt: str, subject: str = "") -> str:
    if not openai_client:
        # Fallback responses when no API key
        academic_responses = [
            f"Great question about {subject}! Let me help you break this down step by step...",
            f"I can definitely help with {subject}! Here's what I suggest...",
            f"That's a common challenge in {subject}. Let's approach it this way...",
            f"Excellent {subject} topic to explore! Consider these key points...",
            f"I understand what you're working on in {subject}. Here's my guidance..."
        ]
        return academic_responses[hash(prompt) % len(academic_responses)]
    
    try:
        system_prompt = f"""You are an academic AI assistant helping high school and college students with their studies. 
        Subject context: {subject}
        Provide helpful, educational guidance that encourages learning and understanding rather than just giving answers.
        Be encouraging, clear, and academically appropriate."""
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "I'm having trouble processing your request right now. Please try again in a moment!"

# API Routes

@app.get("/api/schools")
async def get_schools():
    return TEXAS_SCHOOLS

@app.post("/api/register")
async def register_user(user_data: dict):
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": user_data["name"],
        "email": user_data["email"],
        "school_id": user_data["school_id"],
        "school_type": user_data["school_type"],
        "grade_level": user_data["grade_level"],
        "classes": user_data["classes"],
        "gpa": None,
        "created_at": datetime.now()
    }
    
    db.users.insert_one(user)
    
    # Create or join school chatroom
    school_room_id = f"school_{user_data['school_id']}"
    school_room = db.chat_rooms.find_one({"id": school_room_id})
    
    if not school_room:
        # Create school chatroom
        school_info = None
        school_list = TEXAS_SCHOOLS["high_schools"] if user_data["school_type"] == "high_school" else TEXAS_SCHOOLS["colleges"]
        for school in school_list:
            if school["id"] == user_data["school_id"]:
                school_info = school
                break
        
        school_room = {
            "id": school_room_id,
            "name": f"{school_info['name'] if school_info else user_data['school_id']} School Chat",
            "type": "school",
            "school_id": user_data["school_id"],
            "members": [user_id],
            "created_by": user_id,
            "created_at": datetime.now(),
            "is_secret": False
        }
        db.chat_rooms.insert_one(school_room)
    else:
        # Add user to existing school chatroom
        if user_id not in school_room["members"]:
            db.chat_rooms.update_one(
                {"id": school_room_id},
                {"$push": {"members": user_id}}
            )
    
    return {"message": "User registered successfully", "user_id": user_id}

@app.get("/api/classmates/{user_id}")
async def get_classmates(user_id: str):
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_subjects = [cls["subject"] for cls in user["classes"]]
    
    classmates = list(db.users.find({
        "school_id": user["school_id"],
        "id": {"$ne": user_id},
        "classes.subject": {"$in": user_subjects}
    }))
    
    result = []
    for classmate in classmates:
        shared_subjects = []
        for cls in classmate["classes"]:
            if cls["subject"] in user_subjects:
                shared_subjects.append(cls["subject"])
        
        result.append({
            "id": classmate["id"],
            "name": classmate["name"],
            "email": classmate["email"],
            "grade_level": classmate["grade_level"],
            "shared_classes": shared_subjects
        })
    
    return result

@app.post("/api/help-requests")
async def create_help_request(
    title: str = Form(...),
    subject: str = Form(...),
    description: str = Form(...),
    user_id: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    request_id = str(uuid.uuid4())
    image_urls = []
    
    for file in files:
        if file.filename:
            file_extension = file.filename.split(".")[-1]
            filename = f"{request_id}_{len(image_urls)}.{file_extension}"
            file_path = f"uploads/{filename}"
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            image_urls.append(f"/uploads/{filename}")
    
    help_request = {
        "id": request_id,
        "user_id": user_id,
        "title": title,
        "subject": subject,
        "description": description,
        "image_urls": image_urls,
        "responses": [],
        "status": "open",
        "created_at": datetime.now()
    }
    
    db.help_requests.insert_one(help_request)
    return {"message": "Help request created", "request_id": request_id}

@app.get("/api/help-requests")
async def get_help_requests(school_id: str = None, user_id: str = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    requests = list(db.help_requests.find(query).sort("created_at", -1))
    
    for request in requests:
        user = db.users.find_one({"id": request["user_id"]})
        if user and (not school_id or user["school_id"] == school_id):
            request["user_name"] = user["name"]
            request["user_email"] = user["email"]
            request["user_school"] = user["school_id"]
            request["_id"] = str(request["_id"])
            
            # Add response user details
            for response in request["responses"]:
                response_user = db.users.find_one({"id": response["user_id"]})
                if response_user:
                    response["user_name"] = response_user["name"]
                    response["user_email"] = response_user["email"]
    
    return [req for req in requests if "user_name" in req]

@app.post("/api/help-requests/{request_id}/respond")
async def respond_to_help_request(
    request_id: str,
    user_id: str = Form(...),
    message: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    response_id = str(uuid.uuid4())
    file_urls = []
    
    # Handle file uploads for responses
    for file in files:
        if file.filename:
            file_extension = file.filename.split(".")[-1]
            filename = f"response_{response_id}_{len(file_urls)}.{file_extension}"
            file_path = f"uploads/{filename}"
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            file_urls.append(f"/uploads/{filename}")
    
    response = {
        "id": response_id,
        "user_id": user_id,
        "message": message,
        "file_urls": file_urls,
        "created_at": datetime.now()
    }
    
    db.help_requests.update_one(
        {"id": request_id},
        {"$push": {"responses": response}}
    )
    
    return {"message": "Response added"}

@app.post("/api/ai-assistant")
async def ai_assistant(request_data: dict):
    prompt = request_data.get("prompt", "")
    subject = request_data.get("subject", "")
    
    response = await get_ai_response(prompt, subject)
    return {"response": response}

# Chat System Routes

@app.post("/api/chat/rooms")
async def create_chat_room(room_data: dict):
    room_id = str(uuid.uuid4())
    room = {
        "id": room_id,
        "name": room_data["name"],
        "type": room_data.get("type", "group"),  # "group", "secret", "dm"
        "school_id": room_data.get("school_id"),
        "members": room_data["members"],
        "created_by": room_data["created_by"],
        "created_at": datetime.now(),
        "is_secret": room_data.get("is_secret", False)
    }
    
    db.chat_rooms.insert_one(room)
    return {"message": "Chat room created", "room_id": room_id}

@app.get("/api/chat/rooms/{user_id}")
async def get_user_chat_rooms(user_id: str):
    rooms = list(db.chat_rooms.find({"members": user_id}))
    
    for room in rooms:
        room["_id"] = str(room["_id"])
        # Get recent message count
        recent_messages = db.chat_messages.count_documents({
            "room_id": room["id"],
            "created_at": {"$gte": datetime.now() - timedelta(hours=24)}
        })
        room["recent_message_count"] = recent_messages
    
    return rooms

@app.post("/api/chat/rooms/{room_id}/join")
async def join_chat_room(room_id: str, user_data: dict):
    user_id = user_data["user_id"]
    
    room = db.chat_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if user_id not in room["members"]:
        db.chat_rooms.update_one(
            {"id": room_id},
            {"$push": {"members": user_id}}
        )
    
    return {"message": "Joined room successfully"}

@app.post("/api/chat/rooms/{room_id}/leave")
async def leave_chat_room(room_id: str, user_data: dict):
    user_id = user_data["user_id"]
    
    room = db.chat_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Don't allow leaving school chatrooms completely, just mark as inactive
    if room["type"] == "school":
        return {"message": "Left school chat (can rejoin anytime)"}
    
    db.chat_rooms.update_one(
        {"id": room_id},
        {"$pull": {"members": user_id}}
    )
    
    return {"message": "Left room successfully"}

@app.post("/api/chat/rooms/{room_id}/messages")
async def send_chat_message(
    room_id: str,
    user_id: str = Form(...),
    message: str = Form(...),
    message_type: str = Form(default="text"),
    files: List[UploadFile] = File(default=[])
):
    message_id = str(uuid.uuid4())
    file_urls = []
    
    # Handle file uploads
    for file in files:
        if file.filename:
            file_extension = file.filename.split(".")[-1]
            filename = f"chat_{message_id}_{len(file_urls)}.{file_extension}"
            file_path = f"uploads/{filename}"
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            file_urls.append(f"/uploads/{filename}")
    
    chat_message = {
        "id": message_id,
        "room_id": room_id,
        "user_id": user_id,
        "message": message,
        "message_type": message_type,
        "file_urls": file_urls,
        "created_at": datetime.now()
    }
    
    db.chat_messages.insert_one(chat_message)
    
    # Broadcast to room members via WebSocket
    user = db.users.find_one({"id": user_id})
    broadcast_data = {
        "id": message_id,
        "room_id": room_id,
        "user_id": user_id,
        "user_name": user["name"] if user else "Unknown",
        "message": message,
        "message_type": message_type,
        "file_urls": file_urls,
        "created_at": chat_message["created_at"].isoformat()
    }
    
    await manager.broadcast_to_room(json.dumps(broadcast_data), room_id)
    
    return {"message": "Message sent", "message_id": message_id}

@app.get("/api/chat/rooms/{room_id}/messages")
async def get_chat_messages(room_id: str, limit: int = 50):
    messages = list(db.chat_messages.find({"room_id": room_id}).sort("created_at", -1).limit(limit))
    
    # Add user details to messages
    for message in messages:
        user = db.users.find_one({"id": message["user_id"]})
        if user:
            message["user_name"] = user["name"]
            message["user_email"] = user["email"]
        message["_id"] = str(message["_id"])
    
    return list(reversed(messages))

# AI Chatbot in rooms
@app.post("/api/chat/ai-bot")
async def ai_chatbot_response(request_data: dict):
    prompt = request_data.get("prompt", "")
    room_context = request_data.get("room_context", "")
    
    ai_prompt = f"You are an AI assistant in a student chat room. Context: {room_context}. Student message: {prompt}"
    response = await get_ai_response(ai_prompt)
    
    return {"response": response, "bot_name": "StudyBot"}

# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(websocket, user_id, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            pass
    except WebSocketDisconnect:
        manager.disconnect(user_id, room_id)

# GPA Calculator
@app.post("/api/gpa-calculator")
async def calculate_gpa(grades_data: dict):
    grades = grades_data.get("grades", [])
    total_points = 0
    total_hours = 0
    
    grade_points = {"A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
    
    for grade in grades:
        points = grade_points.get(grade["letter"], 0.0)
        hours = grade.get("credit_hours", 3)
        total_points += points * hours
        total_hours += hours
    
    gpa = total_points / total_hours if total_hours > 0 else 0.0
    return {"gpa": round(gpa, 2)}

@app.post("/api/mla-format")
async def generate_mla_citation(citation_data: dict):
    citation_type = citation_data.get("type", "website")
    
    if citation_type == "website":
        author = citation_data.get("author", "")
        title = citation_data.get("title", "")
        website = citation_data.get("website", "")
        url = citation_data.get("url", "")
        date = citation_data.get("date", "")
        
        citation = f'{author}. "{title}" {website}, {date}, {url}.'
        
    elif citation_type == "book":
        author = citation_data.get("author", "")
        title = citation_data.get("title", "")
        publisher = citation_data.get("publisher", "")
        year = citation_data.get("year", "")
        
        citation = f'{author}. {title}. {publisher}, {year}.'
    
    else:
        citation = "Citation format not supported yet."
    
    return {"citation": citation}

@app.get("/api/academic-resources")
async def get_academic_resources():
    resources = {
        "summarizing_tools": [
            {"name": "QuillBot Summarizer", "url": "https://quillbot.com/summarize", "description": "AI-powered text summarization"},
            {"name": "SMMRY", "url": "https://smmry.com/", "description": "Automatic article summarizer"},
            {"name": "Resoomer", "url": "https://resoomer.com/", "description": "Summarize your documents online"}
        ],
        "study_tools": [
            {"name": "Khan Academy", "url": "https://khanacademy.org", "description": "Free educational content"},
            {"name": "Coursera", "url": "https://coursera.org", "description": "Online courses from universities"},
            {"name": "Quizlet", "url": "https://quizlet.com", "description": "Flashcards and study sets"}
        ],
        "ai_detection_tools": [
            {"name": "ZeroGPT", "url": "https://zerogpt.com", "description": "AI content detection"},
            {"name": "GPTZero", "url": "https://gptzero.me", "description": "Advanced AI detection"},
            {"name": "Originality.ai", "url": "https://originality.ai", "description": "Plagiarism and AI detection"}
        ],
        "research_tools": [
            {"name": "Google Scholar", "url": "https://scholar.google.com", "description": "Academic search engine"},
            {"name": "JSTOR", "url": "https://jstor.org", "description": "Academic articles and books"},
            {"name": "ResearchGate", "url": "https://researchgate.net", "description": "Academic networking platform"}
        ]
    }
    return resources

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
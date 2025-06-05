from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
import httpx
import asyncio

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = pymongo.MongoClient(MONGO_URL)
db = client.school_connect

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

# Texas Schools Data
TEXAS_SCHOOLS = {
    "high_schools": [
        {"id": "plano_east", "name": "Plano East Senior High School", "district": "Plano ISD", "city": "Plano"},
        {"id": "westlake", "name": "Westlake High School", "district": "Eanes ISD", "city": "Austin"},
        {"id": "highland_park", "name": "Highland Park High School", "district": "Highland Park ISD", "city": "Dallas"},
        {"id": "katy", "name": "Katy High School", "district": "Katy ISD", "city": "Katy"},
        {"id": "allen", "name": "Allen High School", "district": "Allen ISD", "city": "Allen"},
        {"id": "southlake_carroll", "name": "Southlake Carroll High School", "district": "Carroll ISD", "city": "Southlake"},
        {"id": "cypress_falls", "name": "Cypress Falls High School", "district": "Cy-Fair ISD", "city": "Houston"},
        {"id": "frisco", "name": "Frisco High School", "district": "Frisco ISD", "city": "Frisco"},
    ],
    "colleges": [
        {"id": "ut_austin", "name": "University of Texas at Austin", "type": "Public University", "city": "Austin"},
        {"id": "texas_am", "name": "Texas A&M University", "type": "Public University", "city": "College Station"},
        {"id": "rice", "name": "Rice University", "type": "Private University", "city": "Houston"},
        {"id": "ttu", "name": "Texas Tech University", "type": "Public University", "city": "Lubbock"},
        {"id": "uh", "name": "University of Houston", "type": "Public University", "city": "Houston"},
        {"id": "tcu", "name": "Texas Christian University", "type": "Private University", "city": "Fort Worth"},
        {"id": "baylor", "name": "Baylor University", "type": "Private University", "city": "Waco"},
        {"id": "utd", "name": "University of Texas at Dallas", "type": "Public University", "city": "Richardson"},
    ]
}

# Pydantic Models
class User(BaseModel):
    id: str
    name: str
    email: str
    school_id: str
    school_type: str  # "high_school" or "college"
    grade_level: str
    classes: List[Dict[str, Any]]
    gpa: Optional[float] = None
    created_at: datetime

class ClassSchedule(BaseModel):
    subject: str
    teacher: str
    period: str
    days: List[str]  # ["Monday", "Tuesday", etc.]
    room: str

class Assignment(BaseModel):
    id: str
    user_id: str
    title: str
    subject: str
    due_date: datetime
    description: str
    completed: bool = False
    priority: str = "medium"  # low, medium, high
    created_at: datetime

class HelpRequest(BaseModel):
    id: str
    user_id: str
    title: str
    subject: str
    description: str
    image_urls: List[str] = []
    responses: List[Dict[str, Any]] = []
    status: str = "open"  # open, answered, closed
    created_at: datetime

class UserRegistration(BaseModel):
    name: str
    email: str
    school_id: str
    school_type: str
    grade_level: str
    classes: List[Dict[str, Any]]

# Free AI Integration (Hugging Face)
async def get_ai_response(prompt: str) -> str:
    try:
        # Using Hugging Face's free inference API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
                headers={"Authorization": "Bearer hf_xxxxxxxxxx"},  # Would use real token
                json={"inputs": prompt, "parameters": {"max_length": 200}}
            )
            if response.status_code == 200:
                result = response.json()
                return result[0]["generated_text"] if result else "I'm here to help! Could you provide more details about your question?"
    except:
        pass
    
    # Fallback responses for demo
    academic_responses = [
        "Great question! Let me help you break this down step by step...",
        "I can definitely help with that! Here's what I suggest...",
        "That's a common challenge. Let's approach it this way...",
        "Excellent topic to explore! Consider these key points...",
        "I understand what you're working on. Here's my guidance..."
    ]
    return academic_responses[hash(prompt) % len(academic_responses)]

# API Routes

@app.get("/api/schools")
async def get_schools():
    return TEXAS_SCHOOLS

@app.post("/api/register")
async def register_user(user_data: UserRegistration):
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "school_id": user_data.school_id,
        "school_type": user_data.school_type,
        "grade_level": user_data.grade_level,
        "classes": user_data.classes,
        "gpa": None,
        "created_at": datetime.now()
    }
    
    db.users.insert_one(user)
    return {"message": "User registered successfully", "user_id": user_id}

@app.get("/api/classmates/{user_id}")
async def get_classmates(user_id: str):
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_subjects = [cls["subject"] for cls in user["classes"]]
    
    # Find users in same school with overlapping classes
    classmates = list(db.users.find({
        "school_id": user["school_id"],
        "id": {"$ne": user_id},
        "classes.subject": {"$in": user_subjects}
    }))
    
    # Format response with shared classes
    result = []
    for classmate in classmates:
        shared_subjects = []
        for cls in classmate["classes"]:
            if cls["subject"] in user_subjects:
                shared_subjects.append(cls["subject"])
        
        result.append({
            "id": classmate["id"],
            "name": classmate["name"],
            "grade_level": classmate["grade_level"],
            "shared_classes": shared_subjects
        })
    
    return result

@app.post("/api/assignments")
async def create_assignment(assignment_data: dict):
    assignment_id = str(uuid.uuid4())
    assignment = {
        "id": assignment_id,
        "user_id": assignment_data["user_id"],
        "title": assignment_data["title"],
        "subject": assignment_data["subject"],
        "due_date": datetime.fromisoformat(assignment_data["due_date"]),
        "description": assignment_data["description"],
        "completed": False,
        "priority": assignment_data.get("priority", "medium"),
        "created_at": datetime.now()
    }
    
    db.assignments.insert_one(assignment)
    return {"message": "Assignment created", "assignment_id": assignment_id}

@app.get("/api/assignments/{user_id}")
async def get_assignments(user_id: str):
    assignments = list(db.assignments.find({"user_id": user_id}).sort("due_date", 1))
    for assignment in assignments:
        assignment["_id"] = str(assignment["_id"])
    return assignments

@app.put("/api/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, update_data: dict):
    db.assignments.update_one(
        {"id": assignment_id},
        {"$set": update_data}
    )
    return {"message": "Assignment updated"}

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
    
    # Handle file uploads
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
    
    # Add user info to each request
    for request in requests:
        user = db.users.find_one({"id": request["user_id"]})
        if user and (not school_id or user["school_id"] == school_id):
            request["user_name"] = user["name"]
            request["user_school"] = user["school_id"]
            request["_id"] = str(request["_id"])
    
    return [req for req in requests if "user_name" in req]

@app.post("/api/help-requests/{request_id}/respond")
async def respond_to_help_request(request_id: str, response_data: dict):
    response = {
        "id": str(uuid.uuid4()),
        "user_id": response_data["user_id"],
        "message": response_data["message"],
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
    
    # Enhanced prompt for academic context
    academic_prompt = f"Academic subject: {subject}\nStudent question: {prompt}\nProvide helpful guidance:"
    
    response = await get_ai_response(academic_prompt)
    return {"response": response}

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
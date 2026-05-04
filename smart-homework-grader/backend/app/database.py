from . import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    classes = db.relationship('Class', backref='teacher', lazy=True)
    essays = db.relationship('Essay', backref='student', lazy=True)

class Class(db.Model):
    __tablename__ = 'classes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    class_members = db.relationship('ClassMember', backref='class_info', lazy=True)
    assignments = db.relationship('Assignment', backref='class_info', lazy=True)

class ClassMember(db.Model):
    __tablename__ = 'class_members'
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    student = db.relationship('User', backref='class_memberships')

class Assignment(db.Model):
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    requirements = db.Column(db.Text, nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    essays = db.relationship('Essay', backref='assignment', lazy=True)

class Essay(db.Model):
    __tablename__ = 'essays'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    word_count = db.Column(db.Integer, default=0)
    image_path = db.Column(db.String(255), nullable=True)
    submitted_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    grading = db.relationship('Grading', backref='essay', uselist=False, lazy=True)
    errors = db.relationship('EssayError', backref='essay', lazy=True)

class Grading(db.Model):
    __tablename__ = 'gradings'
    
    id = db.Column(db.Integer, primary_key=True)
    essay_id = db.Column(db.Integer, db.ForeignKey('essays.id'), nullable=False, unique=True)
    
    content_score = db.Column(db.Float, default=0.0)
    language_score = db.Column(db.Float, default=0.0)
    structure_score = db.Column(db.Float, default=0.0)
    total_score = db.Column(db.Float, default=0.0)
    
    content_comment = db.Column(db.Text, nullable=True)
    language_comment = db.Column(db.Text, nullable=True)
    structure_comment = db.Column(db.Text, nullable=True)
    overall_comment = db.Column(db.Text, nullable=True)
    
    suggestions = db.Column(db.Text, nullable=True)
    highlights = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class EssayError(db.Model):
    __tablename__ = 'essay_errors'
    
    id = db.Column(db.Integer, primary_key=True)
    essay_id = db.Column(db.Integer, db.ForeignKey('essays.id'), nullable=False)
    
    error_type = db.Column(db.String(50), nullable=False)
    original_text = db.Column(db.String(200), nullable=False)
    corrected_text = db.Column(db.String(200), nullable=True)
    explanation = db.Column(db.Text, nullable=True)
    position_start = db.Column(db.Integer, nullable=True)
    position_end = db.Column(db.Integer, nullable=True)
    severity = db.Column(db.String(20), default='minor')
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

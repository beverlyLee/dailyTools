from flask import Blueprint, request, jsonify
from .. import db
from ..database import Class, ClassMember, User, Assignment, Essay

classes = Blueprint('classes', __name__)

@classes.route('/classes', methods=['GET'])
def get_classes():
    try:
        teacher_id = request.args.get('teacher_id')
        student_id = request.args.get('student_id')
        
        if teacher_id:
            class_list = Class.query.filter_by(teacher_id=teacher_id).all()
        elif student_id:
            memberships = ClassMember.query.filter_by(student_id=student_id).all()
            class_list = [m.class_info for m in memberships]
        else:
            class_list = Class.query.all()
        
        result = []
        for c in class_list:
            result.append({
                'id': c.id,
                'name': c.name,
                'teacher_id': c.teacher_id,
                'teacher_name': c.teacher.username if c.teacher else None,
                'description': c.description,
                'student_count': len(c.class_members),
                'created_at': c.created_at.isoformat() if c.created_at else None
            })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classes.route('/classes', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '无效的请求数据'}), 400
        
        name = data.get('name')
        teacher_id = data.get('teacher_id')
        description = data.get('description', '')
        
        if not name or not teacher_id:
            return jsonify({'error': '班级名称和教师ID不能为空'}), 400
        
        new_class = Class(
            name=name,
            teacher_id=teacher_id,
            description=description
        )
        
        db.session.add(new_class)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'class_id': new_class.id,
            'name': new_class.name
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@classes.route('/classes/<int:class_id>', methods=['GET'])
def get_class_detail(class_id):
    try:
        c = Class.query.get_or_404(class_id)
        
        members = ClassMember.query.filter_by(class_id=class_id).all()
        assignments = Assignment.query.filter_by(class_id=class_id).all()
        
        return jsonify({
            'id': c.id,
            'name': c.name,
            'teacher_id': c.teacher_id,
            'teacher_name': c.teacher.username if c.teacher else None,
            'description': c.description,
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'students': [{
                'id': m.student.id,
                'username': m.student.username,
                'email': m.student.email,
                'joined_at': m.joined_at.isoformat() if m.joined_at else None
            } for m in members],
            'assignments': [{
                'id': a.id,
                'title': a.title,
                'description': a.description,
                'deadline': a.deadline.isoformat() if a.deadline else None,
                'essay_count': len(a.essays),
                'created_at': a.created_at.isoformat() if a.created_at else None
            } for a in assignments]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classes.route('/classes/<int:class_id>/students', methods=['POST'])
def add_student(class_id):
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'error': '学生ID不能为空'}), 400
        
        existing = ClassMember.query.filter_by(
            class_id=class_id,
            student_id=student_id
        ).first()
        
        if existing:
            return jsonify({'error': '该学生已在班级中'}), 400
        
        member = ClassMember(
            class_id=class_id,
            student_id=student_id
        )
        
        db.session.add(member)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '学生添加成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@classes.route('/classes/<int:class_id>/assignments', methods=['POST'])
def create_assignment(class_id):
    try:
        data = request.get_json()
        title = data.get('title')
        description = data.get('description', '')
        requirements = data.get('requirements', '')
        
        if not title:
            return jsonify({'error': '作业标题不能为空'}), 400
        
        assignment = Assignment(
            class_id=class_id,
            title=title,
            description=description,
            requirements=requirements
        )
        
        db.session.add(assignment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'assignment_id': assignment.id,
            'title': assignment.title
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

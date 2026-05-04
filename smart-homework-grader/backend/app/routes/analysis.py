from flask import Blueprint, request, jsonify
from sqlalchemy import func
from .. import db
from ..database import Class, Essay, Grading, EssayError, User, Assignment
from collections import Counter

analysis = Blueprint('analysis', __name__)

@analysis.route('/analysis/class/<int:class_id>/overview', methods=['GET'])
def class_overview(class_id):
    try:
        c = Class.query.get_or_404(class_id)
        
        student_count = len(c.class_members)
        assignment_count = len(c.assignments)
        
        essays = Essay.query.join(Assignment).filter(
            Assignment.class_id == class_id
        ).all()
        
        essay_count = len(essays)
        
        total_score = 0
        score_count = 0
        scores = []
        
        for essay in essays:
            grading = Grading.query.filter_by(essay_id=essay.id).first()
            if grading:
                total_score += grading.total_score
                scores.append(grading.total_score)
                score_count += 1
        
        avg_score = round(total_score / score_count, 2) if score_count > 0 else 0
        
        score_distribution = {
            'excellent': len([s for s in scores if s >= 90]),
            'good': len([s for s in scores if 80 <= s < 90]),
            'medium': len([s for s in scores if 70 <= s < 80]),
            'pass': len([s for s in scores if 60 <= s < 70]),
            'fail': len([s for s in scores if s < 60])
        }
        
        return jsonify({
            'class_name': c.name,
            'student_count': student_count,
            'assignment_count': assignment_count,
            'essay_count': essay_count,
            'average_score': avg_score,
            'score_distribution': score_distribution
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis.route('/analysis/class/<int:class_id>/errors', methods=['GET'])
def class_errors(class_id):
    try:
        assignments = Assignment.query.filter_by(class_id=class_id).all()
        assignment_ids = [a.id for a in assignments]
        
        essays = Essay.query.filter(Essay.assignment_id.in_(assignment_ids)).all()
        essay_ids = [e.id for e in essays]
        
        errors = EssayError.query.filter(EssayError.essay_id.in_(essay_ids)).all()
        
        error_types = Counter()
        severity_counts = Counter()
        
        for error in errors:
            error_types[error.error_type] += 1
            severity_counts[error.severity] += 1
        
        return jsonify({
            'total_errors': len(errors),
            'error_types': dict(error_types),
            'severity_distribution': dict(severity_counts),
            'common_errors': error_types.most_common(5)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis.route('/analysis/class/<int:class_id>/students', methods=['GET'])
def class_students_analysis(class_id):
    try:
        members = ClassMember.query.filter_by(class_id=class_id).all()
        
        student_scores = []
        
        for member in members:
            essays = Essay.query.filter_by(student_id=member.student_id).all()
            
            total_score = 0
            essay_count = 0
            scores = []
            
            for essay in essays:
                grading = Grading.query.filter_by(essay_id=essay.id).first()
                if grading:
                    total_score += grading.total_score
                    scores.append(grading.total_score)
                    essay_count += 1
            
            avg_score = round(total_score / essay_count, 2) if essay_count > 0 else 0
            highest_score = max(scores) if scores else 0
            lowest_score = min(scores) if scores else 0
            
            student_scores.append({
                'student_id': member.student_id,
                'student_name': member.student.username,
                'essay_count': essay_count,
                'average_score': avg_score,
                'highest_score': highest_score,
                'lowest_score': lowest_score
            })
        
        student_scores.sort(key=lambda x: x['average_score'], reverse=True)
        
        return jsonify({
            'class_id': class_id,
            'student_count': len(student_scores),
            'students': student_scores
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis.route('/analysis/class/<int:class_id>/dimensions', methods=['GET'])
def class_dimensions_analysis(class_id):
    try:
        assignments = Assignment.query.filter_by(class_id=class_id).all()
        assignment_ids = [a.id for a in assignments]
        
        essays = Essay.query.filter(Essay.assignment_id.in_(assignment_ids)).all()
        essay_ids = [e.id for e in essays]
        
        gradings = Grading.query.filter(Grading.essay_id.in_(essay_ids)).all()
        
        content_scores = []
        language_scores = []
        structure_scores = []
        
        for grading in gradings:
            if grading.content_score > 0:
                content_scores.append(grading.content_score)
            if grading.language_score > 0:
                language_scores.append(grading.language_score)
            if grading.structure_score > 0:
                structure_scores.append(grading.structure_score)
        
        def avg(scores):
            return round(sum(scores) / len(scores), 2) if scores else 0
        
        return jsonify({
            'dimensions': {
                'content': {
                    'average': avg(content_scores),
                    'max': max(content_scores) if content_scores else 0,
                    'min': min(content_scores) if content_scores else 0,
                    'count': len(content_scores)
                },
                'language': {
                    'average': avg(language_scores),
                    'max': max(language_scores) if language_scores else 0,
                    'min': min(language_scores) if language_scores else 0,
                    'count': len(language_scores)
                },
                'structure': {
                    'average': avg(structure_scores),
                    'max': max(structure_scores) if structure_scores else 0,
                    'min': min(structure_scores) if structure_scores else 0,
                    'count': len(structure_scores)
                }
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

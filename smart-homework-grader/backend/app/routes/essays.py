from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import re
from .. import db
from ..database import Essay, Grading, EssayError
from ..services.ocr_service import OCRService
from ..services.nlp_service import NLPService
from ..services.grading_service import GradingService

essays = Blueprint('essays', __name__)
ocr_service = OCRService()
nlp_service = NLPService()
grading_service = GradingService()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clean_html(html_content):
    clean_text = re.sub('<[^<]+?>', '', html_content)
    clean_text = clean_text.replace('&nbsp;', ' ')
    clean_text = re.sub(r'\s+', ' ', clean_text)
    return clean_text.strip()

@essays.route('/essays/submit', methods=['POST'])
def submit_essay():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '无效的请求数据'}), 400
        
        title = data.get('title', '未命名作文')
        content = data.get('content', '')
        student_id = data.get('student_id', 1)
        
        if not content.strip():
            return jsonify({'error': '作文内容不能为空'}), 400
        
        plain_content = clean_html(content)
        word_count = len(plain_content)
        
        essay = Essay(
            title=title,
            content=content,
            word_count=word_count,
            student_id=student_id
        )
        
        db.session.add(essay)
        db.session.commit()
        
        analysis_result = analyze_essay_text(plain_content)
        
        grading_result = grading_service.grade_essay(plain_content, analysis_result)
        
        save_grading(essay.id, grading_result)
        save_errors(essay.id, analysis_result)
        
        return jsonify({
            'success': True,
            'essay_id': essay.id,
            'word_count': word_count,
            'grading': grading_result,
            'analysis': analysis_result
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@essays.route('/essays/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': '没有上传图片'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件格式'}), 400
        
        upload_folder = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        ocr_result = ocr_service.recognize_image(filepath)
        
        if ocr_result['success']:
            return jsonify({
                'success': True,
                'text': ocr_result['text'],
                'confidence': ocr_result.get('confidence', 0.9)
            })
        else:
            return jsonify({'error': ocr_result.get('error', 'OCR识别失败')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@essays.route('/essays/<int:essay_id>', methods=['GET'])
def get_essay(essay_id):
    try:
        essay = Essay.query.get_or_404(essay_id)
        grading = Grading.query.filter_by(essay_id=essay_id).first()
        errors = EssayError.query.filter_by(essay_id=essay_id).all()
        
        return jsonify({
            'essay': {
                'id': essay.id,
                'title': essay.title,
                'content': essay.content,
                'word_count': essay.word_count,
                'submitted_at': essay.submitted_at.isoformat() if essay.submitted_at else None
            },
            'grading': {
                'content_score': grading.content_score if grading else 0,
                'language_score': grading.language_score if grading else 0,
                'structure_score': grading.structure_score if grading else 0,
                'total_score': grading.total_score if grading else 0,
                'content_comment': grading.content_comment if grading else None,
                'language_comment': grading.language_comment if grading else None,
                'structure_comment': grading.structure_comment if grading else None,
                'overall_comment': grading.overall_comment if grading else None,
                'suggestions': grading.suggestions if grading else None
            } if grading else None,
            'errors': [{
                'id': e.id,
                'error_type': e.error_type,
                'original_text': e.original_text,
                'corrected_text': e.corrected_text,
                'explanation': e.explanation,
                'severity': e.severity
            } for e in errors]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@essays.route('/essays/<int:essay_id>/re-analyze', methods=['POST'])
def re_analyze_essay(essay_id):
    try:
        essay = Essay.query.get_or_404(essay_id)
        
        plain_content = clean_html(essay.content)
        
        analysis_result = analyze_essay_text(plain_content)
        grading_result = grading_service.grade_essay(plain_content, analysis_result)
        
        old_grading = Grading.query.filter_by(essay_id=essay_id).first()
        if old_grading:
            db.session.delete(old_grading)
        
        old_errors = EssayError.query.filter_by(essay_id=essay_id).all()
        for error in old_errors:
            db.session.delete(error)
        
        save_grading(essay.id, grading_result)
        save_errors(essay.id, analysis_result)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'grading': grading_result,
            'analysis': analysis_result
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def analyze_essay_text(text):
    syntax_analysis = nlp_service.analyze_syntax(text)
    typos = nlp_service.detect_typos(text)
    idiom_issues = nlp_service.check_idiom_usage(text)
    
    return {
        'syntax_analysis': syntax_analysis,
        'typos': typos,
        'idiom_issues': idiom_issues
    }

def save_grading(essay_id, grading_result):
    grading = Grading(
        essay_id=essay_id,
        content_score=grading_result.get('content_score', 0),
        language_score=grading_result.get('language_score', 0),
        structure_score=grading_result.get('structure_score', 0),
        total_score=grading_result.get('total_score', 0),
        content_comment=grading_result.get('content_comment'),
        language_comment=grading_result.get('language_comment'),
        structure_comment=grading_result.get('structure_comment'),
        overall_comment=grading_result.get('overall_comment'),
        suggestions=grading_result.get('suggestions')
    )
    db.session.add(grading)

def save_errors(essay_id, analysis_result):
    typos = analysis_result.get('typos', [])
    for typo in typos:
        error = EssayError(
            essay_id=essay_id,
            error_type='错别字',
            original_text=typo.get('original', ''),
            corrected_text=typo.get('corrected', ''),
            explanation=typo.get('explanation', ''),
            severity='medium'
        )
        db.session.add(error)
    
    idiom_issues = analysis_result.get('idiom_issues', [])
    for issue in idiom_issues:
        error = EssayError(
            essay_id=essay_id,
            error_type='成语使用',
            original_text=issue.get('idiom', ''),
            explanation=issue.get('suggestion', ''),
            severity='minor'
        )
        db.session.add(error)
    
    syntax_analysis = analysis_result.get('syntax_analysis', {})
    if syntax_analysis.get('sentence_count', 0) > 0:
        avg_length = syntax_analysis.get('avg_sentence_length', 0)
        if avg_length < 5 or avg_length > 30:
            error = EssayError(
                essay_id=essay_id,
                error_type='句式问题',
                original_text='句子平均长度异常',
                explanation=f'句子平均长度为{avg_length}字，建议保持在5-30字之间',
                severity='minor'
            )
            db.session.add(error)

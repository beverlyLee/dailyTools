import pytest
from app.core.knowledge_base import KnowledgeBase, knowledge_base
from app.schemas.disease import TreatmentInfo


class TestKnowledgeBase:
    def test_initialization(self):
        kb = KnowledgeBase()
        assert kb is not None
        assert len(kb.get_all_treatments()) > 0
    
    def test_get_treatment_existing(self):
        kb = KnowledgeBase()
        
        treatment = kb.get_treatment("健康")
        
        assert treatment is not None
        assert treatment.disease_name == "健康"
        assert len(treatment.symptoms) > 0
        assert len(treatment.prevention_methods) > 0
    
    def test_get_treatment_nonexistent(self):
        kb = KnowledgeBase()
        
        treatment = kb.get_treatment("不存在的病害")
        
        assert treatment is None
    
    def test_get_all_treatments(self):
        kb = KnowledgeBase()
        
        all_treatments = kb.get_all_treatments()
        
        assert isinstance(all_treatments, list)
        assert len(all_treatments) >= 14
        
        for treatment in all_treatments:
            assert isinstance(treatment, TreatmentInfo)
            assert treatment.disease_name is not None
            assert len(treatment.disease_name) > 0
    
    def test_add_treatment_new(self):
        kb = KnowledgeBase()
        
        new_treatment = TreatmentInfo(
            disease_name="测试病害",
            symptoms=["症状1", "症状2"],
            prevention_methods=["预防方法1"],
            treatment_methods=["治疗方法1"],
            recommended_pesticides=["药剂1"],
            notes="测试备注"
        )
        
        result = kb.add_treatment(new_treatment)
        
        assert result is True
        
        retrieved = kb.get_treatment("测试病害")
        assert retrieved is not None
        assert retrieved.disease_name == "测试病害"
        assert retrieved.notes == "测试备注"
    
    def test_add_treatment_existing(self):
        kb = KnowledgeBase()
        
        existing_treatment = kb.get_treatment("健康")
        result = kb.add_treatment(existing_treatment)
        
        assert result is False
    
    def test_update_treatment_existing(self):
        kb = KnowledgeBase()
        
        original = kb.get_treatment("番茄早疫病")
        original_notes = original.notes
        
        updated_treatment = TreatmentInfo(
            disease_name="番茄早疫病",
            symptoms=original.symptoms,
            prevention_methods=original.prevention_methods,
            treatment_methods=original.treatment_methods,
            recommended_pesticides=original.recommended_pesticides,
            notes="更新后的备注"
        )
        
        result = kb.update_treatment("番茄早疫病", updated_treatment)
        
        assert result is True
        
        retrieved = kb.get_treatment("番茄早疫病")
        assert retrieved.notes == "更新后的备注"
    
    def test_update_treatment_nonexistent(self):
        kb = KnowledgeBase()
        
        new_treatment = TreatmentInfo(
            disease_name="新病害",
            symptoms=["症状1"],
            prevention_methods=["预防1"],
            treatment_methods=["治疗1"],
            recommended_pesticides=["药剂1"]
        )
        
        result = kb.update_treatment("不存在的病害", new_treatment)
        
        assert result is False
    
    def test_update_treatment_with_name_change(self):
        kb = KnowledgeBase()
        
        original = kb.get_treatment("健康")
        
        updated_treatment = TreatmentInfo(
            disease_name="健康状态",
            symptoms=original.symptoms,
            prevention_methods=original.prevention_methods,
            treatment_methods=original.treatment_methods,
            recommended_pesticides=original.recommended_pesticides,
            notes=original.notes
        )
        
        result = kb.update_treatment("健康", updated_treatment)
        
        assert result is True
        assert kb.get_treatment("健康") is None
        assert kb.get_treatment("健康状态") is not None
    
    def test_delete_treatment_existing(self):
        kb = KnowledgeBase()
        
        treatment = kb.get_treatment("黄瓜白粉病")
        assert treatment is not None
        
        result = kb.delete_treatment("黄瓜白粉病")
        
        assert result is True
        assert kb.get_treatment("黄瓜白粉病") is None
    
    def test_delete_treatment_nonexistent(self):
        kb = KnowledgeBase()
        
        result = kb.delete_treatment("不存在的病害")
        
        assert result is False


class TestKnowledgeBaseDataIntegrity:
    def test_all_diseases_have_complete_data(self):
        kb = KnowledgeBase()
        all_treatments = kb.get_all_treatments()
        
        for treatment in all_treatments:
            assert treatment.disease_name is not None
            assert len(treatment.disease_name) > 0
            
            assert treatment.symptoms is not None
            assert len(treatment.symptoms) > 0
            
            assert treatment.prevention_methods is not None
            assert len(treatment.prevention_methods) > 0
            
            assert treatment.treatment_methods is not None
            assert len(treatment.treatment_methods) > 0
            
            assert treatment.recommended_pesticides is not None
    
    def test_disease_names_match_config(self):
        from app.core.config import settings
        
        kb = KnowledgeBase()
        all_treatments = kb.get_all_treatments()
        
        treatment_names = {t.disease_name for t in all_treatments}
        config_names = set(settings.DISEASE_CLASSES)
        
        for name in config_names:
            assert name in treatment_names, f"病害 {name} 在知识库中缺失"


class TestKnowledgeBaseSingleton:
    def test_singleton_instance(self):
        from app.core.knowledge_base import knowledge_base as kb1
        from app.core.knowledge_base import knowledge_base as kb2
        
        assert kb1 is kb2
    
    def test_singleton_data_consistency(self):
        from app.core.knowledge_base import knowledge_base as kb1
        from app.core.knowledge_base import knowledge_base as kb2
        
        treatment1 = kb1.get_treatment("健康")
        treatment2 = kb2.get_treatment("健康")
        
        assert treatment1 is treatment2

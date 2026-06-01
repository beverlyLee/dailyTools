import json
import csv
import os
import scrapy
from datetime import datetime
from itemadapter import ItemAdapter


class MatchmakingPipeline:
    def open_spider(self, spider):
        self.items = []
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        self.items.append(dict(adapter))
        return item
    
    def close_spider(self, spider):
        output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        json_path = os.path.join(output_dir, f'matchmaking_data_{timestamp}.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)
        
        csv_path = os.path.join(output_dir, f'matchmaking_data_{timestamp}.csv')
        if self.items:
            keys = self.items[0].keys()
            with open(csv_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.items)


class OCRValidationPipeline:
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        confidence = adapter.get('ocr_confidence', 0)
        
        if confidence < 0.5:
            item['data_quality'] = 'low'
        elif confidence < 0.8:
            item['data_quality'] = 'medium'
        else:
            item['data_quality'] = 'high'
        
        return item


class DuplicatesPipeline:
    def __init__(self):
        self.ids_seen = set()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_id = adapter.get('item_id')
        
        if item_id in self.ids_seen:
            raise scrapy.exceptions.DropItem(f"Duplicate item found: {item_id}")
        else:
            self.ids_seen.add(item_id)
            return item

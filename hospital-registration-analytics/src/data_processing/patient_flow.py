import pandas as pd
import numpy as np
import os


class PatientFlowAnalyzer:
    def __init__(self, data_path=None, use_simulation=True):
        self.data_path = data_path
        self.use_simulation = use_simulation
        self.data = None
        self.load_data()

    def load_data(self):
        if self.use_simulation or self.data_path is None:
            self.data = self._generate_simulated_data()
        else:
            try:
                self.data = pd.read_csv(self.data_path)
            except (FileNotFoundError, pd.errors.EmptyDataError):
                self.data = self._generate_simulated_data()

    def _generate_simulated_data(self):
        np.random.seed(42)
        departments = ['内科', '外科', '皮肤科', '妇产科', '儿科', '骨科', '眼科', '口腔科']
        hospitals = ['北京协和医院', '北京大学第一医院', '中国人民解放军总医院', '北京天坛医院']
        
        data = []
        patient_id = 0
        
        for hospital in hospitals:
            n_patients = 500 if hospital != '北京天坛医院' else 200
            
            for _ in range(n_patients):
                patient_id += 1
                initial_dept = np.random.choice(departments)
                
                current_dept = initial_dept
                visit_count = 0
                max_visits = np.random.randint(1, 5)
                
                while visit_count < max_visits:
                    visit_count += 1
                    
                    if visit_count == 1:
                        status = '初诊'
                    elif visit_count == max_visits and np.random.random() < 0.3:
                        status = '住院'
                    elif np.random.random() < 0.15 and visit_count < max_visits:
                        status = '转科'
                    else:
                        status = '复诊'
                    
                    base_wait = {
                        '皮肤科': 120 if hospital == '北京协和医院' else 45,
                        '内科': 75,
                        '外科': 60,
                        '妇产科': 40,
                        '儿科': 65,
                        '骨科': 55,
                        '眼科': 35,
                        '口腔科': 30
                    }.get(current_dept, 40)
                    
                    wait_time = np.random.randint(base_wait // 2, base_wait * 2)
                    
                    target_dept = None
                    if status == '转科':
                        if current_dept == '内科':
                            target_dept = np.random.choice(['外科', '皮肤科', '骨科', '妇产科'], 
                                                          p=[0.45, 0.25, 0.2, 0.1])
                        else:
                            available_depts = [d for d in departments if d != current_dept]
                            target_dept = np.random.choice(available_depts)
                    
                    data.append({
                        '患者ID': f'P{patient_id:06d}',
                        '医院': hospital,
                        '科室': current_dept,
                        '候诊时长': wait_time,
                        '就诊日期': pd.Timestamp('2024-01-01') + pd.Timedelta(days=np.random.randint(0, 90)),
                        '患者状态': status,
                        '目标科室': target_dept,
                        '就诊次数': visit_count
                    })
                    
                    if status == '转科' and target_dept:
                        current_dept = target_dept
                    elif status == '住院':
                        break
        
        return pd.DataFrame(data)

    def calculate_average_wait_time(self, hospital=None):
        if hospital:
            filtered_data = self.data[self.data['医院'] == hospital]
        else:
            filtered_data = self.data
        
        avg_wait = filtered_data.groupby('科室')['候诊时长'].agg(['mean', 'count', 'std']).reset_index()
        avg_wait.columns = ['科室', '平均候诊时长', '就诊人数', '候诊时长标准差']
        avg_wait['平均候诊时长'] = avg_wait['平均候诊时长'].round(2)
        avg_wait['候诊时长标准差'] = avg_wait['候诊时长标准差'].round(2)
        return avg_wait.sort_values('平均候诊时长', ascending=False)

    def get_complete_flow_chain_3layer(self, hospital=None):
        if hospital:
            filtered_data = self.data[self.data['医院'] == hospital]
        else:
            filtered_data = self.data
        
        departments = sorted(filtered_data['科室'].unique())
        statuses = ['初诊', '复诊', '住院', '转科']
        
        flows = []
        node_info = {}
        
        for dept in departments:
            node_info[dept] = {
                'color': '#2ecc71', 
                'type': '科室',
                'layer': 0
            }
        
        for status in statuses:
            status_colors = {
                '初诊': '#3498db',
                '复诊': '#f39c12',
                '住院': '#e74c3c',
                '转科': '#9b59b6'
            }
            node_info[status] = {
                'color': status_colors[status],
                'type': '状态',
                'layer': 1
            }
        
        transfer_data = filtered_data[filtered_data['患者状态'] == '转科']
        target_depts = transfer_data[transfer_data['目标科室'].notna()]['目标科室'].unique()
        
        for target_dept in target_depts:
            node_name = f'{target_dept}(转入)'
            node_info[node_name] = {
                'color': '#1abc9c',
                'type': '转入',
                'layer': 2
            }
        
        for dept in departments:
            dept_data = filtered_data[filtered_data['科室'] == dept]
            
            for status in statuses:
                status_data = dept_data[dept_data['患者状态'] == status]
                count = len(status_data)
                
                if count > 0:
                    flows.append({
                        'source': dept,
                        'target': status,
                        'value': count
                    })
                
                if status == '转科':
                    valid_transfers = status_data[pd.notna(status_data['目标科室'])]
                    target_counts = valid_transfers['目标科室'].value_counts()
                    for target_dept, t_count in target_counts.items():
                        flows.append({
                            'source': '转科',
                            'target': f'{target_dept}(转入)',
                            'value': int(t_count)
                        })
        
        node_values = {}
        for node in node_info.keys():
            total_value = 0
            for f in flows:
                if f['source'] == node or f['target'] == node:
                    total_value += f['value']
            node_values[node] = total_value
        
        return flows, node_info, node_values

    def get_continuous_patient_journey(self, hospital=None):
        if hospital:
            filtered_data = self.data[self.data['医院'] == hospital]
        else:
            filtered_data = self.data
        
        flows = []
        node_info = {}
        node_values = {}
        
        departments = sorted(filtered_data['科室'].unique())
        statuses = ['初诊', '复诊', '住院', '转科']
        
        layer_nodes = {
            0: [d for d in departments],
            1: ['初诊', '复诊', '住院', '转科'],
            2: [f'{d}(后续)' for d in departments],
            3: ['初诊(2)', '复诊(2)', '住院(2)', '转科(2)'],
            4: [f'{d}(最终)' for d in departments]
        }
        
        colors = [
            ['#2ecc71', '#27ae60', '#1abc9c', '#16a085'],
            ['#3498db', '#f39c12', '#e74c3c', '#9b59b6'],
            ['#e67e22', '#d35400', '#f1c40f', '#f39c12'],
            ['#3498db', '#f39c12', '#e74c3c', '#9b59b6'],
            ['#1abc9c', '#16a085', '#2ecc71', '#27ae60']
        ]
        
        for layer, nodes in layer_nodes.items():
            for i, node in enumerate(nodes):
                if layer == 1 or layer == 3:
                    status_name = node.replace('(2)', '')
                    status_colors = {
                        '初诊': '#3498db',
                        '复诊': '#f39c12',
                        '住院': '#e74c3c',
                        '转科': '#9b59b6'
                    }
                    color = status_colors[status_name]
                    node_type = '状态'
                else:
                    color = colors[layer][i % len(colors[layer])]
                    node_type = '科室' if layer in [0, 2, 4] else '状态'
                
                node_info[node] = {
                    'color': color,
                    'type': node_type,
                    'layer': layer
                }
        
        journey_counts = {}
        
        for dept in departments:
            dept_data = filtered_data[filtered_data['科室'] == dept]
            
            for status in statuses:
                status_data = dept_data[dept_data['患者状态'] == status]
                count = len(status_data)
                if count > 0:
                    flow_key = (dept, status)
                    journey_counts[flow_key] = journey_counts.get(flow_key, 0) + count
                
                if status == '转科':
                    valid_transfers = status_data[pd.notna(status_data['目标科室'])]
                    for _, row in valid_transfers.iterrows():
                        target_dept = row['目标科室']
                        
                        flow_key = ('转科', f'{target_dept}(后续)')
                        journey_counts[flow_key] = journey_counts.get(flow_key, 0) + 1
                        
                        next_dept_data = filtered_data[
                            (filtered_data['患者ID'] == row['患者ID']) &
                            (filtered_data['就诊次数'] > row['就诊次数'])
                        ]
                        
                        if len(next_dept_data) > 0:
                            next_row = next_dept_data.sort_values('就诊次数').iloc[0]
                            next_status = next_row['患者状态']
                            
                            flow_key = (f'{target_dept}(后续)', f'{next_status}(2)')
                            journey_counts[flow_key] = journey_counts.get(flow_key, 0) + 1
                            
                            if next_status == '转科':
                                final_dept = next_row['目标科室']
                                if pd.notna(final_dept):
                                    flow_key = (f'转科(2)', f'{final_dept}(最终)')
                                    journey_counts[flow_key] = journey_counts.get(flow_key, 0) + 1
        
        for (source, target), count in journey_counts.items():
            flows.append({
                'source': source,
                'target': target,
                'value': count
            })
        
        for node in node_info.keys():
            total_value = 0
            for f in flows:
                if f['source'] == node or f['target'] == node:
                    total_value += f['value']
            node_values[node] = total_value
        
        return flows, node_info, node_values

    def get_internal_to_surgical_ratio(self, hospital=None):
        transfers = self.get_department_transfer_matrix(hospital)
        internal_to_surgical = 0
        total_transfers = 0
        
        for t in transfers:
            total_transfers += t['value']
            if t['source'] == '内科' and t['target'] == '外科':
                internal_to_surgical += t['value']
        
        ratio = (internal_to_surgical / total_transfers * 100) if total_transfers > 0 else 0
        return {
            'internal_to_surgical': internal_to_surgical,
            'total_transfers': total_transfers,
            'ratio': round(ratio, 2)
        }

    def get_department_transfer_matrix(self, hospital=None):
        if hospital:
            filtered_data = self.data[self.data['医院'] == hospital]
        else:
            filtered_data = self.data
        
        transfer_data = filtered_data[filtered_data['患者状态'] == '转科']
        
        transfers = []
        for _, row in transfer_data.iterrows():
            if pd.notna(row['目标科室']):
                transfers.append({
                    'source': row['科室'],
                    'target': row['目标科室'],
                    'value': 1
                })
        
        if transfers:
            transfer_df = pd.DataFrame(transfers)
            transfer_summary = transfer_df.groupby(['source', 'target']).sum().reset_index()
            return transfer_summary.to_dict('records')
        return []

    def get_hospital_data_completeness(self, hospital):
        hospital_data = self.data[self.data['医院'] == hospital]
        total_records = len(hospital_data)
        
        transfer_records = hospital_data[hospital_data['患者状态'] == '转科']
        valid_transfers = transfer_records[pd.notna(transfer_records['目标科室'])].shape[0]
        
        has_transfer_data = valid_transfers > 0
        statuses_present = set(hospital_data['患者状态'].unique())
        has_complete_statuses = statuses_present >= {'初诊', '复诊', '住院', '转科'}
        has_patient_journey = '患者ID' in hospital_data.columns
        
        if has_transfer_data and has_complete_statuses and has_patient_journey:
            return '完整'
        elif has_transfer_data and has_complete_statuses:
            return '较完整'
        else:
            return '基础'

    def get_data_summary(self):
        return {
            'total_patients': self.data['患者ID'].nunique(),
            'total_records': len(self.data),
            'hospitals': self.data['医院'].unique().tolist(),
            'departments': self.data['科室'].unique().tolist(),
            'has_transfer_data': self.data['目标科室'].notna().any(),
            'is_simulation': self.use_simulation
        }

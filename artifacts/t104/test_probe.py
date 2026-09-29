"""Safety assertions use captured live fields; artificial inputs are explicitly labelled."""
import unittest,json
from analyze import *
class Safety(unittest.TestCase):
 def event(self,name,id):return next(e for e in read(name)['payload']['results'] if e['id']==id)
 def test_actual_deposit_never_free_total(self):
  e=self.event('DG-09_page_1',190707);p=price(e['price'],e['is_free']);self.assertEqual(p['price_kind'],'conditional');self.assertEqual(p['mandatory_extra_min'],700);self.assertEqual(budget(p,0)[0],'NO_PASS')
 def test_actual_null_end_ignores_equal_epoch(self):
  row=json.loads((OUT/'MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json').read_text(encoding='utf-8'))['tasks'][9];e=self.event('DG-10_11_page_1',row['source_event_id']);d=row['selected_raw_date'];self.assertIsNone(d['end_time']);self.assertIsNone(occurrence(d,e)['ends_at'])
 def test_actual_no_place_no_fake_coordinates(self):
  row=json.loads((OUT/'MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json').read_text(encoding='utf-8'))['tasks'][10];e=self.event('DG-10_11_page_1',row['source_event_id']);o=occurrence(row['selected_raw_date'],e);self.assertIsNone(o['coordinates']);self.assertFalse(o['location_known']);self.assertEqual(o['lifecycle_status'],'UNKNOWN')
 def test_actual_recurring_not_invented(self):
  e=self.event('DG-06_page_1',209577);d=e['dates'][-1];self.assertTrue(d['schedules']);self.assertIsNone(occurrence(d,e)['starts_at'])
 def test_actual_multiday_not_invented_daily_session(self):
  e=self.event('DG-07_page_1',210889);o=occurrence(e['dates'][-1],e);self.assertEqual(o['time_precision'],'UNKNOWN');self.assertIsNone(o['starts_at'])
 def test_actual_exact_empty(self):
  r=read('DG-12_page_1');self.assertEqual(r['http_status'],200);self.assertEqual(r['payload'],{'count':0,'next':None,'previous':None,'results':[]});self.assertEqual(r['request_parameters']['is_free'],'true');self.assertEqual(r['request_parameters']['categories'],'theater')
 def test_actual_lower_bound_no_budget_pass(self):
  e=self.event('DG-05_page_1',203229);p=price(e['price'],False);self.assertEqual(p['price_kind'],'from');self.assertEqual(budget(p,2500)[0],'UNKNOWN')
 def test_actual_price_scope(self):
  e=self.event('DG-04_page_1',202293);p=price(e['price'],e['is_free']);self.assertEqual(p['price_kind'],'exact');self.assertEqual(p['evidence_scope'],'EVENT');self.assertEqual(p['payable_total'],'UNKNOWN');self.assertEqual(budget(p,1000)[0],'UNKNOWN')
 def test_synthetic_arbitrary_numeric_text_not_price(self):
  self.assertEqual(price('скидка 20% до 22:00',False)['price_kind'],'unknown')
 def test_synthetic_free_flag_is_not_all_in(self):
  p=price('',True);self.assertEqual(p['price_kind'],'free');self.assertEqual(budget(p,0)[0],'UNKNOWN')
 def test_historical_not_promoted_to_live(self):
  gate=json.loads((OUT/'MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json').read_text(encoding='utf-8'))
  self.assertTrue(all(t['result']=='NO_PASS' for t in gate['tasks'][:3]));self.assertEqual(gate['summary']['verified_suitable_task_count'],0)
 def test_final_status_vocabulary_and_separate_gate(self):
  gate=json.loads((OUT/'MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json').read_text(encoding='utf-8'));self.assertEqual(len(gate['tasks']),12)
  self.assertTrue(all(t['result'] in ['PASS','NO_PASS','UNKNOWN','ERROR'] for t in gate['tasks']));self.assertFalse(any(t['suitable_occurrence_verified'] for t in gate['tasks'][9:]));self.assertEqual(gate['summary']['LEGAL_MANUAL_GATE'],'OPEN')
if __name__=='__main__':unittest.main()

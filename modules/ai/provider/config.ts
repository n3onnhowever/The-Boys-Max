import type {ModelConfig} from './types.ts';
/** Public documented IDs, not account access and not immutable weight fingerprints.
 * No 'latest', no user-controlled URL, no automatic model switch. */
export const MODELS:Readonly<Record<string,ModelConfig>> = Object.freeze({
  'groq-gpt-oss-120b': {id:'groq-gpt-oss-120b',provider:'groq',model:'openai/gpt-oss-120b',endpoint:'https://api.groq.com/openai/v1/chat/completions',models_endpoint:'https://api.groq.com/openai/v1/models',credential_env:'GROQ_API_KEY',request_parameters:{temperature:0,max_completion_tokens:2048,reasoning_effort:'low',stream:false}},
  'mistral-small-2603': {id:'mistral-small-2603',provider:'mistral',model:'mistral-small-2603',endpoint:'https://api.mistral.ai/v1/chat/completions',models_endpoint:'https://api.mistral.ai/v1/models',credential_env:'MISTRAL_API_KEY',request_parameters:{temperature:0,max_tokens:2048,stream:false}},
  'groq-qwen-3.8-27b': {id:'groq-qwen-3.8-27b',provider:'groq',model:'qwen/qwen3.8-27b',endpoint:'https://api.groq.com/openai/v1/chat/completions',models_endpoint:'https://api.groq.com/openai/v1/models',credential_env:'GROQ_API_KEY',request_parameters:{temperature:0,max_completion_tokens:2048,reasoning_effort:'none',reasoning_format:'hidden',stream:false}},
  'gigachat-3-ultra': {id:'gigachat-3-ultra',provider:'gigachat',model:'GigaChat-3-Ultra',endpoint:'https://api.giga.chat/v1/chat/completions',models_endpoint:'https://api.giga.chat/v1/models',credential_env:'GIGACHAT_ACCESS_TOKEN',request_parameters:{temperature:0,max_tokens:2048,stream:false}}
});
// Nested structures must not be changed by a caller after the run plan is frozen.
for(const x of Object.values(MODELS)){Object.freeze(x.request_parameters);Object.freeze(x);}
export function modelConfig(id:string):ModelConfig {if(typeof id!=='string'||!Object.hasOwn(MODELS,id))throw new Error('MODEL_NOT_CONFIGURED');return MODELS[id]!;}

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize the modern Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_ai_decision(status_data):
    """
    Reasoning Engine using Gemini 3.0 Flash.
    Optimized with 'Thinking Levels' for agentic precision.
    """
    model_id = "gemini-3-flash-preview"
    
    prompt = f"""
    You are an autonomous system monitor.
    Current Metrics: {status_data}
    
    RULES:
    - If 'load' > 85, output 'ACTION:BUY | REASON: High load scaling'.
    - If 'sub_days' < 3, output 'ACTION:BUY | REASON: Subscription renewal'.
    - Otherwise, output 'ACTION:WAIT'.
    
    Maintain high reasoning quality. 
    """

    try:
        # Generate content using Gemini 3.0 Flash
        response = client.models.generate_content(
            model=model_id,
            contents=prompt
        )
        
        return response.text.strip()
        
    except Exception as e:
        # If you hit the limit, wait 60s
        if "429" in str(e):
            print("🛑 Gemini 3.0 Quota Full. Waiting 60s for reset...")
            import time
            time.sleep(60)
        else:
            print(f"❌ Gemini 3.0 Error: {e}")
        return "ACTION:WAIT"

if __name__ == "__main__":
    # Test
    print(f"AI Decision: {get_ai_decision({'load': 95, 'sub_days': 10})}")
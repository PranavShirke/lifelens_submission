from datetime import datetime
import base64

def generate_memory_book_html(memories, patient_name):
    """
    Generate a beautifully formatted HTML memory book that can be printed or saved as PDF.
    """
    # Sort memories by timestamp
    sorted_memories = sorted(memories, key=lambda m: m.get("timestamp", 0), reverse=True)
    
    # Build memory cards HTML
    memory_cards = ""
    for i, mem in enumerate(sorted_memories):
        timestamp = mem.get("timestamp", 0)
        try:
            if isinstance(timestamp, (int, float)) and timestamp > 0:
                date_str = datetime.fromtimestamp(timestamp).strftime("%B %d, %Y at %I:%M %p")
            else:
                date_str = str(timestamp)
        except:
            date_str = "Unknown date"
        
        # Person tags - can be list or comma string
        person_tags_html = ""
        tags = mem.get("person_tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        if tags:
            tag_items = "".join(f'<span class="person-tag">👤 {t}</span>' for t in tags)
            person_tags_html = f'<div class="tags-row">{tag_items}</div>'
        
        # Location
        location_html = ""
        loc = mem.get("location")
        if loc:
            loc_name = loc.get("name", "") if isinstance(loc, dict) else str(loc)
            if loc_name:
                location_html = f'<div class="location-badge">📍 {loc_name}</div>'
        
        # Sentiment
        sentiment = mem.get("sentiment", "")
        sentiment_html = ""
        sentiment_map = {
            "happy": ("😊", "#10B981", "Happy"),
            "Happy": ("😊", "#10B981", "Happy"),
            "sad": ("😢", "#3B82F6", "Sad"),
            "Sad": ("😢", "#3B82F6", "Sad"),
            "anxious": ("😰", "#F59E0B", "Anxious"),
            "Anxious": ("😰", "#F59E0B", "Anxious"),
            "neutral": ("😐", "#6B7280", "Neutral"),
            "Neutral": ("😐", "#6B7280", "Neutral"),
            "confused": ("😕", "#8B5CF6", "Confused"),
            "Confused": ("😕", "#8B5CF6", "Confused"),
            "angry": ("😠", "#EF4444", "Angry"),
            "Angry": ("😠", "#EF4444", "Angry"),
        }
        if sentiment in sentiment_map:
            emoji, color, label = sentiment_map[sentiment]
            sentiment_html = f'<span class="sentiment-badge" style="background: {color}15; color: {color}; border: 1px solid {color}30;">{emoji} {label}</span>'
        
        # Category badge
        category = mem.get("category", "")
        category_html = ""
        if category:
            category_html = f'<span class="category-badge">⭐ {category}</span>'
        
        # Image
        image_html = ""
        img_b64 = mem.get("source_image_base64") or mem.get("image_base64") or mem.get("base64")
        if img_b64:
            image_html = f'<img class="memory-image" src="data:image/jpeg;base64,{img_b64}" alt="Memory photo" />'
        
        # Content
        content_html = ""
        mem_type = mem.get("type", "text")
        if mem.get("caption"):
            content_html = f'<div class="memory-content">{mem["caption"]}</div>'
        if mem.get("transcript"):
            content_html += f'<div class="memory-content transcript">🎤 "{mem["transcript"]}"</div>'
        if mem.get("content"):
            content_html += f'<div class="memory-content">📝 {mem["content"]}</div>'
        if mem.get("analysis"):
            content_html += f'<div class="memory-analysis">💡 {mem["analysis"]}</div>'
        
        # Type icon
        type_icons = {"image": "📷", "audio": "🎙️", "text": "📝"}
        type_icon = type_icons.get(mem_type, "📝")
        
        memory_cards += f"""
        <div class="memory-card">
            <div class="memory-header">
                <div class="memory-meta">
                    <span class="memory-type">{type_icon} {mem_type.title()}</span>
                    <span class="memory-date">{date_str}</span>
                </div>
                <div class="memory-badges">
                    {sentiment_html}
                    {category_html}
                </div>
            </div>
            {image_html}
            {content_html}
            {person_tags_html}
            {location_html}
        </div>
        """
    
    total_count = len(sorted_memories)
    created_date = datetime.now().strftime("%B %d, %Y")
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{patient_name}'s Memory Book — LifeLens</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700;800&display=swap');
        
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #F8F7F4;
            color: #1E1B2E;
            line-height: 1.6;
        }}
        
        .book-container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        /* Cover Page */
        .cover {{
            text-align: center;
            padding: 100px 40px;
            background: linear-gradient(135deg, #1E1B2E 0%, #2A2640 40%, #3D2F5C 100%);
            color: white;
            border-radius: 24px;
            margin-bottom: 50px;
            position: relative;
            overflow: hidden;
            page-break-after: always;
        }}
        .cover::before {{
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255,140,66,0.25) 0%, transparent 70%);
            border-radius: 50%;
        }}
        .cover::after {{
            content: '';
            position: absolute;
            bottom: -30%;
            left: -10%;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(122,158,122,0.2) 0%, transparent 70%);
            border-radius: 50%;
        }}
        .cover-emoji {{
            font-size: 64px;
            margin-bottom: 20px;
            display: block;
            position: relative;
            z-index: 1;
        }}
        .cover h1 {{
            font-family: 'Playfair Display', serif;
            font-size: 52px;
            font-weight: 800;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }}
        .cover h2 {{
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 400;
            color: rgba(255,255,255,0.7);
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
        }}
        .cover .meta {{
            font-size: 13px;
            color: rgba(255,255,255,0.5);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 600;
            position: relative;
            z-index: 1;
        }}
        .cover .divider {{
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #FF8C42, #FFC299);
            margin: 20px auto;
            border-radius: 10px;
            position: relative;
            z-index: 1;
        }}
        .cover .stats {{
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 30px;
            position: relative;
            z-index: 1;
        }}
        .cover .stat-item {{
            text-align: center;
        }}
        .cover .stat-value {{
            font-size: 32px;
            font-weight: 900;
            color: #FFC299;
        }}
        .cover .stat-label {{
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: rgba(255,255,255,0.5);
            margin-top: 4px;
        }}
        
        /* Memory Cards */
        .memory-card {{
            background: white;
            padding: 32px;
            margin-bottom: 24px;
            border-radius: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
            border: 1px solid rgba(0,0,0,0.04);
            page-break-inside: avoid;
            transition: box-shadow 0.3s;
        }}
        
        .memory-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .memory-meta {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .memory-type {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #9896B0;
        }}
        .memory-date {{
            font-size: 13px;
            color: #9896B0;
            font-weight: 500;
        }}
        .memory-badges {{
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }}
        .sentiment-badge {{
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }}
        .category-badge {{
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            background: #FFF5E6;
            color: #C9A96E;
            border: 1px solid rgba(201,169,110,0.2);
        }}
        
        .memory-image {{
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            border-radius: 16px;
            margin: 16px 0;
        }}
        
        .memory-content {{
            font-size: 16px;
            line-height: 1.8;
            color: #1E1B2E;
            margin-bottom: 12px;
        }}
        .memory-content.transcript {{
            font-style: italic;
            color: #5A576E;
            padding-left: 16px;
            border-left: 3px solid #FFC299;
        }}
        .memory-analysis {{
            font-size: 13px;
            color: #7A9E7A;
            padding: 12px 16px;
            background: #EAF2E9;
            border-radius: 12px;
            margin-top: 12px;
        }}
        
        .tags-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
        }}
        .person-tag {{
            display: inline-block;
            background: #F0EEFF;
            color: #5B52A3;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }}
        
        .location-badge {{
            margin-top: 12px;
            font-size: 12px;
            color: #9896B0;
            font-weight: 500;
        }}
        
        /* Footer */
        .book-footer {{
            text-align: center;
            padding: 40px 20px;
            color: #9896B0;
            font-size: 12px;
        }}
        .book-footer .logo {{
            font-weight: 800;
            font-size: 16px;
            color: #1E1B2E;
            margin-bottom: 8px;
        }}
        
        @media print {{
            body {{ background: white; }}
            .book-container {{ padding: 0; }}
            .memory-card {{ box-shadow: none; border: 1px solid #eee; page-break-inside: avoid; }}
            .cover {{ page-break-after: always; }}
        }}
    </style>
</head>
<body>
    <div class="book-container">
        <div class="cover">
            <span class="cover-emoji">🧠</span>
            <h1>{patient_name}'s</h1>
            <h2>Memory Book</h2>
            <div class="divider"></div>
            <p class="meta">Generated by LifeLens on {created_date}</p>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">{total_count}</div>
                    <div class="stat-label">Memories</div>
                </div>
            </div>
        </div>
        
        {memory_cards}
        
        <div class="book-footer">
            <div class="logo">🧠 LifeLens</div>
            <p>Memory Preservation • AI-Powered Care • {created_date}</p>
        </div>
    </div>
</body>
</html>"""
    
    return html

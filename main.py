from datetime import datetime, timedelta
from PIL import Image, ImageDraw

def calculate_weeks_lived(birthdate):
    birth_date = datetime.strptime(birthdate, "%Y-%m-%d")
    current_date = datetime.now()
    lived_days = (current_date - birth_date).days
    lived_weeks = lived_days // 7
    return lived_weeks

def create_life_grid(lived_weeks, total_years=90):
    weeks_per_year = 52
    total_weeks = total_years * weeks_per_year
    
    # Create a blank image with white background
    img_width = total_years * 10
    img_height = weeks_per_year * 10
    img = Image.new('RGB', (img_width, img_height), color='white')
    draw = ImageDraw.Draw(img)
    
    for week in range(total_weeks):
        x = (week // weeks_per_year) * 10
        y = (week % weeks_per_year) * 10
        color = 'blue' if week < lived_weeks else 'gray'
        draw.rectangle([x, y, x+9, y+9], fill=color)
    
    return img

def main():
    birthdate = input("Введите вашу дату рождения (гггг-мм-дд): ")
    lived_weeks = calculate_weeks_lived(birthdate)
    life_grid_img = create_life_grid(lived_weeks)
    life_grid_img.show()
    life_grid_img.save("life_in_weeks.png")

if __name__ == "__main__":
    main()
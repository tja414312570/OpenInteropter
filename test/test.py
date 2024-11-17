from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time

def get_today_news():
    # 设置Chrome浏览器选项
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 无头模式，即不显示浏览器窗口
    driver = webdriver.Chrome(options=chrome_options)

    # 访问新闻网站（这里以新浪新闻为例）
    driver.get("https://news.sina.com.cn/")
    time.sleep(3)  # 等待页面加载

    # 获取页面源代码
    page_source = driver.page_source
    driver.quit()

    # 使用BeautifulSoup解析页面
    soup = BeautifulSoup(page_source, 'html.parser')

    # 获取今天的日期
    today = datetime.now().date()

    # 找到新闻标题和而新闻发布时间的元素
    news_items = soup.find_all('div', class_='news-item')
    today_news = []
    for item in news_items:
        news_date_str = item.find('a').text
        news_date = datetime.strptime(news_date_str, '%Y年%m月%d日 %H:%M').date()
        if news_date == today:
            title = item.find('a').text
            link = item.find('a')['href']
            today_news.append({"title": title, "link": link})
    return today_news
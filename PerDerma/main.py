# main.py

import os  
import pandas as pd  
from rich.progress import track  
from get_main_body import get_all_main_body  
from get_comments_level_one import get_all_level_one  
from get_comments_level_two import get_all_level_two  
import logging  
  
logging.basicConfig(level=logging.INFO)  
  
  
class WBParser:  
    def __init__(self, cookie):  
        self.cookie = cookie  
  
        os.makedirs("./WBData", exist_ok=True)  
        os.makedirs("./WBData/Comments_level_1", exist_ok=True)  
        os.makedirs("./WBData/Comments_level_2", exist_ok=True)  
        self.main_body_filepath = "./WBData/demo.csv"  
        self.comments_level_1_filename = "./WBData/demo_comments_one.csv"  
        self.comments_level_2_filename = "./WBData/demo_comments_two.csv"  
        self.comments_level_1_dirpath = "./WBData/Comments_level_1/"  
        self.comments_level_2_dirpath = "./WBData/Comments_level_2/"  
  
    def get_main_body(self, q, kind):  
        data = get_all_main_body(q, kind, self.cookie)  
        data = data.reset_index(drop=True).astype(str).drop_duplicates()  
        data.to_csv(self.main_body_filepath, encoding="utf_8_sig")  
  
    def get_comments_level_one(self):  
        data_list = []  
        main_body = pd.read_csv(self.main_body_filepath, index_col=0)  
  
        logging.info(f"主体内容一共有{main_body.shape[0]:5d}个，现在开始解析...")  
  
        for ix in track(range(main_body.shape[0]), description=f"解析中..."):  
            uid = main_body.iloc[ix]["uid"]  
            mid = main_body.iloc[ix]["mid"]  
            final_file_path = f"{self.comments_level_1_dirpath}{uid}_{mid}.csv"  
  
            if os.path.exists(final_file_path):  
                length = pd.read_csv(final_file_path).shape[0]  
                if length > 0:  
                    continue  
  
            data = get_all_level_one(uid=uid, mid=mid, cookie=self.cookie)  
            data.drop_duplicates(inplace=True)  
            data.to_csv(final_file_path, encoding="utf_8_sig")  
            data_list.append(data)  
        logging.info(f"主体内容一共有{main_body.shape[0]:5d}个，已经解析完毕！")  
        data = pd.concat(data_list).reset_index(drop=True).astype(str).drop_duplicates()  
        data.to_csv(self.comments_level_1_filename)  
  
    def get_comments_level_two(self):  
        data_list = []  
        comments_level_1_data = pd.read_csv(self.comments_level_1_filename, index_col=0)  
  
        logging.info(  
            f"一级评论一共有{comments_level_1_data.shape[0]:5d}个，现在开始解析..."  
        )  
  
        for ix in track(  
            range(comments_level_1_data.shape[0]), description=f"解析中..."  
        ):  
            main_body_uid = comments_level_1_data.iloc[ix]["main_body_uid"]  
            mid = comments_level_1_data.iloc[ix]["mid"]  
            final_file_path = (  
                f"{self.comments_level_2_dirpath}{main_body_uid}_{mid}.csv"  
            )  
  
            if os.path.exists(final_file_path):  
                length = pd.read_csv(final_file_path).shape[0]  
                if length > 0:  
                    continue  
  
            data = get_all_level_two(uid=main_body_uid, mid=mid, cookie=self.cookie)  
            data.drop_duplicates(inplace=True)  
            data.to_csv(final_file_path, encoding="utf_8_sig")  
            data_list.append(data)  
        logging.info(  
            f"一级评论一共有{comments_level_1_data.shape[0]:5d}个，已经解析完毕！"  
        )  
        data = pd.concat(data_list).reset_index(drop=True).astype(str).drop_duplicates()  
        data.to_csv(self.comments_level_2_filename)  
  
  
if __name__ == "__main__":  
    q = "#大熊猫不是猫#"  # 话题  
    kind = "热门"  # 综合，实时，热门，高级  
    cookie = "_T_WM=81528164683; WEIBOCN_FROM=1110006030; SCF=AimPrIgj7t61wPAR5qzY_aq-7Fdit45WRSfEnUHbRf-BFEGD66xXA6KMJewvi2TVXDprzGkEz1RHa4DFUcaPTQE.; SUB=_2A25FRqLtDeRhGedJ6FQW-S3KzTmIHXVmPbolrDV6PUJbktANLXmhkW1NVjdKSYiscaC3O-VSNXMLmkipo8kSUWsd; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhRF_Y2FebWDT_4xjfLJ2om5NHD95QpS0ecS0.0SoqfWs4Dqcj.i--Ni-iFiK.4i--ciKnRiK.pi--NiKnEi-z4i--Ri-zpiKnc; SSOLoginState=1749209789; ALF=1751801789; MLOGIN=1; BAIDU_SSP_lcr=https://www.google.com/; XSRF-TOKEN=e57a55; mweibo_short_token=5f310429e6; M_WEIBOCN_PARAMS=luicode%3D10000011%26lfid%3D102803%26uicode%3D10000011%26fid%3D102803%26oid%3D5165458455268645"  # 设置你的cookie
    wbparser = WBParser(cookie)  
    wbparser.get_main_body(q, kind) # 获取主体内容  
    wbparser.get_comments_level_one() # 获取一级评论
    wbparser.get_comments_level_two() # 获取二级评论

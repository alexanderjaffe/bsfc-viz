import re
import datetime
import sqlite3
import pandas as pd
import random

# trim out excess symbols, specific edits
def cleanup_name(field):
    
    m = re.search(".*?([A-z0-9].+)", field)
    new = m.group(1)
    
    # case specific edits
    if "Farmers Market" in new:
        return new.replace("Farmers Market", "Farmer's Market")
    elif "GT " in new:
        return new.replace("GT", "GT's")
    elif "Gimme" in new:
        return new.replace("Gimme","GimME")
    elif "Larrys" in new:
        return new.replace("Larrys","Larry's")
    elif "Larry " in new:
        return new.replace("Larry", "Larry's")
    elif "Lukes" in new:
        return new.replace("Lukes", "Luke's")
    elif "Pro Bar" in new:
        return new.replace("Pro Bar", "ProBar")
    else: return new

# trim out excess symbols and chars
def trim_category(field):
    
    #m = re.search("(.*)?[\[]*.+", field)
    # return m.group(1)
    if field == "None":
        return "Other"
    else:
        temp = field.replace(" [Cashier Code: - ]", "")
        return temp.replace(" [Cashier Code: ' ]", "")

def assign_subcat(name, subcats):

    try:
        if subcats[name] == "":
            return "Other"
        else: return subcats[name]
    except:
        return "Other"

def assign_brand(field, brands):

    final = ""
    for brand in brands:
        if brand in field:
            final = brand
            break

    if final != "":
        return final
    else: return "Other"

# change dates to midnight for aggregation
def midnight(item):

    d = datetime.datetime.strptime(item, "%Y-%m-%d %H:%M:%S.%f")
    #d = datetime.datetime.fromtimestamp(item/1000.0)
    #d = datetime.datetime.strftime("%Y-%m-%d 00:00:00")

    return d.strftime("%Y-%m-%d")

def main():
    
    QUERY = '''SELECT item_item.id, name, category, price, price_type, unit_name, \
        item_cost, store_use, spoilage, food_prep, committee, sold, member_discount_applied, \
            created_at FROM item_item INNER JOIN cost_cost ON item_item.cost_id = cost_cost.id \
            INNER JOIN revenue_revenue ON item_item.revenue_id = revenue_revenue.id'''
    brands = [line.strip("\n") for line in open("data/brands.txt")]
    
    # read in manual subcat info
    subcats = {}
    for line in open("data/subcats.txt"):
        subcats[line.split("\t")[0]] = line.split("\t")[1].strip("\n")

    # read sql query into table
    #items_df1 = pd.read_sql(QUERY, sqlite3.connect('data/db.sqlite3'))
    #items_df2 = pd.read_sql(QUERY, sqlite3.connect('data/db2.sqlite3'))
    #items_df = pd.concat([items_df1, items_df2])
    items_df = pd.read_sql(QUERY, sqlite3.connect('data/db3.sqlite3'))
    # trim and modify fields
    items_df["key"] = items_df["name"].apply(cleanup_name)
    items_df["brand"] = items_df["name"].apply(lambda x: assign_brand(x, brands))
    items_df["new_cat"] = items_df["category"].apply(lambda x: trim_category(str(x)))
    items_df["sub_cat"] = items_df["key"].apply(lambda x: assign_subcat(x, subcats))
    items_df["new_date"] = items_df.created_at.apply(midnight)
    # remove old fields
    items = items_df.drop(["id","created_at","name","category"], axis=1)
    # group and aggregate by item/date
    items_grouped = items.groupby(["key","new_date"], as_index=False).aggregate({"price":"first", \
        "price_type":"first", "sold":"sum", "unit_name":"first", "item_cost":"first", \
        "store_use":"sum", "spoilage":"sum","food_prep":"sum", "committee":"sum", \
        "member_discount_applied":"sum", "new_cat":"first", "brand":"first", "sub_cat":"first"})
    
    # TEMP - make fake data
    # get unique combos 
    names = ["key","unit_name","price","sub_cat","new_cat","item_cost","price_type","brand"]
    zipped = zip(items_grouped.key, items_grouped.unit_name, items_grouped.price, items_grouped["sub_cat"], \
                 items_grouped["new_cat"],items_grouped["item_cost"],items_grouped["price_type"],items_grouped["brand"])
    zuniq = list(set(zipped))

    fake_data = []
    start = 21

    for i in range(1,40):
        day = start + i
        date = "2017-03-" + str(day)
        if day > 31:
            day = day % 31
            date = "2017-04-" + str(day)
        
        for item in zuniq:
            temp = {}
            for i in range(0,len(item)):
                temp[names[i]] = item[i]
            temp["new_date"] = date
            temp["sold"] = random.choice([0]*20+[1]*4+[3]*2+[4]*3+[5]*2+[9]*2)
            temp["spoilage"] = 0
            temp["food_prep"] = 0
            temp["store_use"] = 0
            temp["committee"] = 0
            temp["member_discount_applied"] = 0
            
            fake_data.append(temp)

    fake_df = pd.DataFrame(fake_data)
    merged_items = pd.concat([items_grouped, fake_df])
    
    # write to json
    merged_items.to_json("data/items.json", orient="records")

if __name__ == '__main__':
    main()


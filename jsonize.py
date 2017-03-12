import re
import datetime
import sqlite3
import pandas as pd

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
    temp = field.replace(" [Cashier Code: - ]", "")
    return temp.replace(" [Cashier Code: ' ]", "")

#def assign_subcat(row):

    # TODO

def assign_brand(field, brands):

    final = ""
    for brand in brands:
        if brand in field:
            final = brand
            break

    if final != "":
        return final
    else: return None

# change dates to midnight for aggregation
def midnight(date):
    try:
        d = datetime.datetime.strptime(date, "%Y-%m-%d %H:%M:%S.%f")
    except:
        d = datetime.datetime.strptime(date, "%Y-%m-%d %H:%M:%S")
    return d.strftime("%Y-%m-%d 00:00:00")

def main():
    
    QUERY = '''SELECT item_item.id, name, category, price, price_type, unit_name, \
        item_cost, store_use, spoilage, food_prep, committee, sold, member_discount_applied, \
            created_at FROM item_item INNER JOIN cost_cost ON item_item.cost_id = cost_cost.id \
            INNER JOIN revenue_revenue ON item_item.revenue_id = revenue_revenue.id'''
    brands = [line.strip("\n") for line in open("data/brands.txt")]

    # read sql query into table
    items_df = pd.read_sql(QUERY, sqlite3.connect('data/db.sqlite3'))
    # trim and modify fields
    items_df["new_name"] = items_df["name"].apply(cleanup_name)
    items_df["brand"] = items_df["name"].apply(lambda x: assign_brand(x, brands))
    items_df["new_cat"] = items_df["category"].apply(lambda x: trim_category(str(x)))
    # items_df["sub_cat"] = items_df.apply(assign_subcat, axis=0)
    items_df["new_date"] = items_df.created_at.apply(midnight)
    # remove old fields
    items = items_df.drop(["id","created_at","name"], axis=1)
    # group and aggregate by item/date
    items_grouped = items.groupby(["new_name","new_date"], as_index=False).aggregate({"price":"first", \
        "price_type":"first", "sold":"sum", "unit_name":"first", "item_cost":"first", \
        "store_use":"sum", "spoilage":"sum","food_prep":"sum", "committee":"sum", \
        "member_discount_applied":"sum", "new_cat":"first", "brand":"first"})
    # write to json
    items_grouped.to_json("data/items.json", orient="records")

if __name__ == '__main__':
    main()


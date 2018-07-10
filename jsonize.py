import re, datetime, sqlite3, gspread
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials

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

'''# trim out excess symbols and chars
def trim_category(field):

    #m = re.search("(.*)?[\[]*.+", field)
    # return m.group(1)
    if field == "None":
        return "Other"
    else:
        temp = field.replace(" [Cashier Code: - ]", "")
        return temp.replace(" [Cashier Code: ' ]", "")'''

# change dates to midnight for aggregation
def midnight(item):

    d = datetime.datetime.strptime(item, "%Y-%m-%d %H:%M:%S.%f")

    return d.strftime("%Y-%m-%d")

def main():

    # set up sql query
    QUERY = '''SELECT item_item.id, name, category, price, price_type, unit_name, \
        item_cost, store_use, spoilage, food_prep, committee, sold, member_discount_applied,
            pif_discount_applied, misc_discount_applied, created_at FROM item_item \
            INNER JOIN cost_cost ON item_item.cost_id = cost_cost.id \
            INNER JOIN revenue_revenue ON item_item.revenue_id = revenue_revenue.id'''

    # set up google API credientials
    scope = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']
    credentials = ServiceAccountCredentials.from_json_keyfile_name('bsfc-inventory-credentials.json', scope)
    gc = gspread.authorize(credentials)

    # read in meta data from google doc
    worksheet = gc.open("bsfc inventory test").sheet1
    all_worksheet_vals = worksheet.get_all_values()
    # remove header and convert to pandas
    metadata = pd.DataFrame(all_worksheet_vals[1:])
    metadata.columns = ["key", "brand", "new_cat", "sub_cat"]

    # read sql query into table
    items_df = pd.read_sql(QUERY, sqlite3.connect('data/db_may.sqlite3'))
    # trim and modify fields
    items_df["key"] = items_df["name"].apply(cleanup_name)
    # and merge
    items_df = pd.merge(items_df, metadata, on="key")
    #items_df["sub_cat"] = items_df["key"].apply(lambda x: assign_subcat(x, subcats))
    items_df["new_date"] = items_df.created_at.apply(midnight)

    # remove old fields
    items = items_df.drop(["id","created_at","name","category"], axis=1)
    # group and aggregate by item/date
    items_grouped = items.groupby(["key","new_date"], as_index=False).aggregate({"price":"first", \
        "price_type":"first", "sold":"sum", "unit_name":"first", "item_cost":"first", \
        "store_use":"sum", "spoilage":"sum","food_prep":"sum", "committee":"sum", \
        "member_discount_applied":"sum", "pif_discount_applied":"sum", "misc_discount_applied":"sum", \
        "new_cat":"first", "brand":"first", "sub_cat":"first"})

    items_grouped.to_json("data/items.json", orient="records")

if __name__ == '__main__':
    main()

from mongita import MongitaClientDisk
import os

print("Testing Mongita...")
try:
    client = MongitaClientDisk(host="./test_mongita")
    db = client["test_db"]
    col = db["test_col"]
    
    col.update_one(
        {"name": "test"},
        {"$setOnInsert": {"name": "test", "val": 1}},
        upsert=True
    )
    print("SetOnInsert success")
    
    col.update_one(
        {"name": "test"},
        {"$push": {"tags": "a"}}
    )
    print("Push success")
    
    doc = col.find_one({"name": "test"})
    print("Found doc:", doc)
    
except Exception as e:
    print("Error:", e)

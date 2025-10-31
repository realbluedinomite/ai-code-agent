# 🔍 Check Your Current Git Repository
# Run these commands to see what you pushed:

echo "📍 Current directory:"
pwd

echo ""
echo "📂 Files in current directory:"
ls -la

echo ""
echo "🌿 Git status:"
git status

echo ""
echo "📝 Recent commits:"
git log --oneline -5

echo ""
echo "📁 Git tracked files:"
git ls-files

echo ""
echo "🔗 Remote origin:"
git remote -v